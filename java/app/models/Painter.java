package models;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import play.libs.Json;
import play.mvc.WebSocket;

public class Painter {
	public String name;
	public String color;
	public Long size;

    public final WebSocket.Out<JsonNode> channel;

    public Painter(WebSocket.Out<JsonNode> channel) {
        this.channel = channel;
    }

    public Painter(String name, String color, Long size, WebSocket.Out<JsonNode> channel) {
		this.name = name;
		this.color = color;
		this.size = size;
        this.channel = channel;
	}

    public void updateFromJson(JsonNode json) {
        if(json.has("name"))
            this.name = json.get("name").textValue();
        if(json.has("color"))
            this.color = json.get("color").textValue();
        if(json.has("size"))
            this.size = json.get("size").longValue();
    }
    
    public JsonNode toJson() {
        ObjectNode json = Json.newObject();
        json.put("name", this.name);
        json.put("color", this.color);
        json.put("size", this.size);
        return  json;
    }

    @Override
    public String toString() {
        return "Painter{" +
                "name='" + name + '\'' +
                ", color='" + color + '\'' +
                ", size=" + size +
                '}';
    }
}