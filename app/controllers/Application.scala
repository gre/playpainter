package controllers

import play.api._
import play.api.mvc._
import play.api.libs.json._
import play.api.libs.iteratee._
import play.api.libs.concurrent._

object Application extends Controller {

  var counter = 0
  val hubEnum = Enumerator.imperative[JsValue]()
  val hub = Concurrent.hub[JsValue](hubEnum)
  
  def index = Action {
    Ok(views.html.index("Play Painter"))
  }

  def stream = WebSocket.async[JsValue] { request =>
    // Connected
    val out = hub.getPatchCord()
    counter += 1 
    val pid = counter

    val in = Iteratee.foreach[JsValue](_ match {
      case message: JsObject => {
        hubEnum push ( message ++ JsObject(Seq("pid" -> JsNumber(pid)))  )
      }
    })

    Promise.pure( (in, out) )
  }
  
}
