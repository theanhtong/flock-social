import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws/posts',
})
@Injectable()
export class PostsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PostsGateway.name);

  constructor(private readonly configService: ConfigService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Posts WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Posts WS client disconnected: ${client.id}`);
  }

  broadcastNewPost(post: any) {
    this.logger.log(`Broadcasting new post: ${post.id}`);
    this.server.emit('new_post_created', post);
  }
}
