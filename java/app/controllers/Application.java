package controllers;

import models.PaintRoom;
import org.codehaus.jackson.JsonNode;
import play.mvc.Controller;
import play.mvc.Result;
import play.mvc.WebSocket;
import views.html.index;

public class Application extends Controller {
  
	static PaintRoom env = new PaintRoom("Public");

  	public static Result index() {
    	return ok(index.render(env));
  	}

    public static WebSocket<JsonNode> stream() {
        
        return new WebSocket<JsonNode>() {
            @Override
            public void onReady(In<JsonNode> in, Out<JsonNode> out) {
                try{
                    env.createPainter(in, out);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        };
    
    }
}