package controllers

import play.api._
import play.api.mvc._
import play.api.libs.json._
import play.api.libs.iteratee._
import play.api.libs.concurrent._

object Application extends Controller {

  var users = List[PushEnumerator[JsValue]]()
  var counter = 0
  
  def index = Action {
    Ok(views.html.index("Play Painter"))
  }

  def stream = WebSocket.async[JsValue] { request =>
    // Connected
    val out = Enumerator.imperative[JsValue]()
    users = List(out) ++ users
    counter += 1 
    val pid = counter

    val in = Iteratee.foreach[JsValue](_ match {
      case message: JsObject => {
        // Forward for each users
        users.foreach( (user) =>
          user push ( message ++ JsObject(Seq("pid" -> JsNumber(pid)))  )
        )
      }
    }) mapDone { _ =>
      // Disconnected
      users -= out
    }

    Promise.pure( (in, out) )
  }
  
}
