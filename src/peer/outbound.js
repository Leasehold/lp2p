/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */

const {
  ClientOptionsUpdated,
  convertNodeInfoToLegacyFormat,
  DEFAULT_ACK_TIMEOUT,
  DEFAULT_CONNECT_TIMEOUT,
  EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
  Peer,
  PeerConfig,
  REMOTE_EVENT_MESSAGE,
  REMOTE_EVENT_RPC_REQUEST,
} = require('./base');

const { EVENT_PING } = require('./inbound');

const querystring = require('querystring');
const socketClusterClient = require('socketcluster-client');

const EVENT_DISCOVERED_PEER = 'discoveredPeer';
const EVENT_CONNECT_OUTBOUND = 'connectOutbound';
const EVENT_CONNECT_ABORT_OUTBOUND = 'connectAbortOutbound';
const EVENT_CLOSE_OUTBOUND = 'closeOutbound';
const EVENT_OUTBOUND_SOCKET_ERROR = 'outboundSocketError';
const RESPONSE_PONG = 'pong';
const PEER_KIND_OUTBOUND = 'outbound';

const socketErrorStatusCodes = {
  ...socketClusterClient.SCClientSocket.errorStatuses,
  1000: 'Intentionally disconnected',
};

class OutboundPeer extends Peer {
  constructor(peerInfo, peerConfig) {
    super(peerInfo, peerConfig);
    this.kind = PEER_KIND_OUTBOUND;
  }

  set socket(scClientSocket) {
    if (this._socket) {
      this._unbindHandlersFromOutboundSocket(this._socket);
    }
    this._socket = scClientSocket;
    this._bindHandlersToOutboundSocket(this._socket);
  }

  send(packet) {
    if (!this._socket) {
      this._socket = this._createOutboundSocket();
    }

    super.send(packet);
  }

  async request(packet) {
    if (!this._socket) {
      this._socket = this._createOutboundSocket();
    }

    return super.request(packet);
  }

  _createOutboundSocket() {
    const legacyNodeInfo = this._nodeInfo
      ? convertNodeInfoToLegacyFormat(this._nodeInfo)
      : undefined;

    const connectTimeout = this._peerConfig.connectTimeout
      ? this._peerConfig.connectTimeout
      : DEFAULT_CONNECT_TIMEOUT;
    const ackTimeout = this._peerConfig.ackTimeout
      ? this._peerConfig.ackTimeout
      : DEFAULT_ACK_TIMEOUT;

    // Ideally, we should JSON-serialize the whole NodeInfo object but this cannot be done for compatibility reasons, so instead we put it inside an options property.
    const clientOptions = {
      hostname: this._ipAddress,
      port: this._wsPort,
      query: querystring.stringify({
        ...legacyNodeInfo,
        options: JSON.stringify(legacyNodeInfo),
      }),
      connectTimeout,
      ackTimeout,
      multiplex: false,
      autoConnect: false,
      autoReconnect: false,
      maxPayload: this._peerConfig.wsMaxPayloadOutbound,
    };

    const outboundSocket = socketClusterClient.create(clientOptions);

    this._bindHandlersToOutboundSocket(outboundSocket);

    return outboundSocket;
  }

  connect() {
    if (!this._socket) {
      this._socket = this._createOutboundSocket();
    }
    this._socket.connect();
  }

  disconnect(code = 1000, reason) {
    super.disconnect(code, reason);
    if (this._socket) {
      this._unbindHandlersFromOutboundSocket(this._socket);
    }
  }

  // All event handlers for the outbound socket should be bound in this method.
  _bindHandlersToOutboundSocket(outboundSocket) {
    outboundSocket.on('error', (error) => {
      this.emit(EVENT_OUTBOUND_SOCKET_ERROR, error);
    });

    outboundSocket.on('connect', async () => {
      this.emit(EVENT_CONNECT_OUTBOUND, this._peerInfo);
      try {
        await Promise.all([this.fetchStatus(), this.discoverPeers()]);
      } catch (error) {
        this.emit(EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT, error);
      }
    });

    outboundSocket.on('connectAbort', () => {
      this.emit(EVENT_CONNECT_ABORT_OUTBOUND, this._peerInfo);
    });

    outboundSocket.on(
      'close',
      (code, reasonMessage) => {
        const reason = reasonMessage
          ? reasonMessage
          : socketErrorStatusCodes[code] || 'Unknown reason';
        this.emit(EVENT_CLOSE_OUTBOUND, {
          peerInfo: this._peerInfo,
          code,
          reason,
        });
      },
    );

    outboundSocket.on('message', this._handleWSMessage);

    outboundSocket.on(
      EVENT_PING,
      (data, res) => {
        res(undefined, RESPONSE_PONG);
      },
    );

    // Bind RPC and remote event handlers
    outboundSocket.on(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
    outboundSocket.on(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
    outboundSocket.on('postBlock', this._handleRawLegacyMessagePostBlock);
    outboundSocket.on(
      'postSignatures',
      this._handleRawLegacyMessagePostSignatures,
    );
    outboundSocket.on(
      'postTransactions',
      this._handleRawLegacyMessagePostTransactions,
    );
  }

  // All event handlers for the outbound socket should be unbound in this method.
  _unbindHandlersFromOutboundSocket(outboundSocket) {
    // Do not unbind the error handler because error could still throw after disconnect.
    // We don't want to have uncaught errors.
    outboundSocket.off('connect');
    outboundSocket.off('connectAbort');
    outboundSocket.off('close');
    outboundSocket.off('message', this._handleWSMessage);

    // Unbind RPC and remote event handlers
    outboundSocket.off(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
    outboundSocket.off(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
    outboundSocket.off('postBlock', this._handleRawLegacyMessagePostBlock);
    outboundSocket.off(
      'postSignatures',
      this._handleRawLegacyMessagePostSignatures,
    );
    outboundSocket.off(
      'postTransactions',
      this._handleRawLegacyMessagePostTransactions,
    );
    outboundSocket.off(EVENT_PING);
  }
}

module.exports = {
  EVENT_DISCOVERED_PEER,
  EVENT_CONNECT_OUTBOUND,
  EVENT_CONNECT_ABORT_OUTBOUND,
  EVENT_CLOSE_OUTBOUND,
  EVENT_OUTBOUND_SOCKET_ERROR,
  RESPONSE_PONG,
  PEER_KIND_OUTBOUND,
  OutboundPeer,
};
