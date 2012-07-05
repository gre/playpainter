package controllers

import play.api._
import play.api.mvc._
import play.api.libs.json._
import play.api.libs.iteratee._
import play.api.libs.concurrent._
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.ConcurrentHashMap
import scala.collection.mutable.ConcurrentMap
import collection.JavaConversions._

object Application extends Controller {

  val env = PaintRoom("Public")

  def index = Action {
    Ok(views.html.index(env))
  }

  def stream = WebSocket.async[JsValue] { request =>
    Promise.pure( env.createPainter() )
  }
  
}

object Painter {
  def fromJson (o: JsObject) = {
    Painter((o \ "name").as[String], (o \ "color").as[String], (o \ "size").as[Long])
  }
}

// A Painter represent a user controlling a brush (with a color and a size)
case class Painter (name: String, color: String, size: Long) {
  def toJson = JsObject(Seq(
    "name"->JsString(name), 
    "color"->JsString(color), 
    "size"->JsNumber(size)
  ))
}

case class PaintRoom(name: String) {
  // The list of all connected painters (identified by ids)
  val painters: ConcurrentMap[Int, Painter] = new ConcurrentHashMap[Int, Painter]()

  // The enum for pushing data to spread to all connected painters
  val hubEnum = Enumerator.imperative[JsValue]()

  // The hub used to get multiple output of a common input (the hubEnum)
  val hub = Concurrent.hub[JsValue](hubEnum)

  private var counter = new AtomicInteger(0)
  private var connections = new AtomicInteger(0)

  // Create a new painter and get a (input, output) couple for him
  def createPainter(): (Iteratee[JsValue, _], Enumerator[JsValue]) = {
    counter.incrementAndGet()
    connections.incrementAndGet()
    val pid = counter.get // the painter id

    // out: handle messages to send to the painter
    val out = 
      // Inform the painter who he is (which pid, he can them identify himself)
      Enumerator(JsObject(Seq("type" -> JsString("youAre"), "pid" -> JsNumber(pid))).as[JsValue]) >>> 
      // Inform the list of other painters
      Enumerator(painters.map { case (id, painter) => 
        (painter.toJson ++ JsObject(Seq("type" -> JsString("painter"), "pid" -> JsNumber(id)))).as[JsValue]
      } toList : _*) >>> 
      // Stream the hub
      hub.getPatchCord()

    // in: handle messages from the painter
    val in = Iteratee.foreach[JsValue](_ match {

      // The painter wants to change some of his property
      case change: JsObject if (change \ "type") == JsString("change") => {
        val patchedJson = 
          painters.get(pid). // try to get the current painter
          map(_.toJson ++ change). // if get, patch it with the change
          getOrElse(change); // otherwise, just consider the change
        painters += ((pid, Painter.fromJson(patchedJson))) // update in the map
        hubEnum push (patchedJson ++ JsObject(Seq("pid" -> JsNumber(pid))))
      }

      // User is drawing something
      case draw: JsObject => {
        hubEnum push (draw ++ JsObject(Seq("pid" -> JsNumber(pid))))
      }
    }) mapDone { _ => 
      // User has disconnected.
      painters -= pid
      connections.decrementAndGet()
      hubEnum push (JsObject(Seq("type" -> JsString("disconnect"), "pid" -> JsNumber(pid))))
      Logger.debug("(pid:"+pid+") disconnected.")
      Logger.info(connections+" painter(s) currently connected.");
    }

    Logger.debug("(pid:"+pid+") connected.")
    Logger.info(connections+" painter(s) currently connected.");

    // Return the painter input and output
    (in, out)
  }
}

