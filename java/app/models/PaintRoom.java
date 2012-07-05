package models;

import org.codehaus.jackson.JsonNode;
import org.codehaus.jackson.node.ObjectNode;
import play.Logger;
import play.libs.F;
import play.libs.Json;
import play.mvc.WebSocket;

import java.util.HashMap;
import java.util.Map;

public class PaintRoom {
	
	public String name;
    // The list of all connected painters (identified by ids)
    public Map<Integer, Painter> painters = new HashMap<Integer, Painter>(); // FIXME not thread safe, use ConcurrentMap
    public int counter = 0; // FIXME not thread safe, use AtomicInteger
    public int connections = 0; // FIXME not thread safe, use AtomicInteger

	public PaintRoom(String name) {
		this.name = name;
	}

    public void createPainter(final WebSocket.In<JsonNode> in, final WebSocket.Out<JsonNode> out) {
        counter++;
        connections++;
        final int pid = counter; // the painter id

        // in: handle messages from the painter
        in.onMessage(new F.Callback<JsonNode>() {
            @Override
            public void invoke(JsonNode json) throws Throwable {
                String type = json.get("type").getTextValue();

                // The painter wants to change some of his property
                if("change".equals(type)) {
                    Painter painter = painters.get(pid);
                    if(painter == null) {
                        painter = new Painter(out);
                        painters.put(pid, painter);

                        // Inform the painter who he is (which pid, he can them identify himself)
                        ObjectNode self = Json.newObject();
                        self.put("type", "youAre");
                        self.put("pid", pid);
                        painter.channel.write(self);

                        // Inform the list of other painters
                        for(Map.Entry<Integer, Painter> entry : painters.entrySet()) {
                            ObjectNode other = (ObjectNode)entry.getValue().toJson();
                            other.put("pid", entry.getKey());
                            painter.channel.write(other);
                        }
                    }
                    painter.updateFromJson(json);
                }

                ObjectNode node = ((ObjectNode)json);
                node.put("pid", pid);
                PaintRoom.this.notifyAll(node);
            }
        });

        // User has disconnected.
        in.onClose(new F.Callback0() {
            @Override
            public void invoke() throws Throwable {
                painters.remove(pid);
                connections--;

                ObjectNode json = Json.newObject();
                json.put("type", "disconnect");
                json.put("pid", pid);

                PaintRoom.this.notifyAll(json);

                Logger.debug("(pid:"+pid+") disconnected.");
                Logger.info(connections+" painter(s) currently connected.");
            }
        });

        Logger.debug("(pid:"+pid+") connected.");
        Logger.info(connections+" painter(s) currently connected.");
    }

    public void notifyAll(JsonNode json) {
        for(Painter painter : painters.values()) {
            painter.channel.write(json);
        }
    }
	
}
