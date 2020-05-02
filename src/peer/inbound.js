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
	Peer,
	PeerConfig,
	REMOTE_EVENT_MESSAGE,
	REMOTE_EVENT_RPC_REQUEST,
	SCServerSocketUpdated,
} = require('./base');

const { SCServerSocket } = require('socketcluster-server');
const socketErrorStatusCodes = {
	...SCServerSocket.errorStatuses,
	1000: 'Intentionally disconnected',
};

const EVENT_CLOSE_INBOUND = 'closeInbound';
const EVENT_INBOUND_SOCKET_ERROR = 'inboundSocketError';
const EVENT_PING = 'ping';

const DEFAULT_PING_INTERVAL_MAX = 60000;
const DEFAULT_PING_INTERVAL_MIN = 20000;

const getRandomPingDelay = () =>
	Math.random() * (DEFAULT_PING_INTERVAL_MAX - DEFAULT_PING_INTERVAL_MIN) +
	DEFAULT_PING_INTERVAL_MIN;

class InboundPeer extends Peer {
	constructor(peerInfo, peerSocket, peerConfig) {
		super(peerInfo, peerConfig);
		this._handleInboundSocketError = (error) => {
			this.emit(EVENT_INBOUND_SOCKET_ERROR, error);
		};
		this._handleInboundSocketClose = (code, reasonMessage) => {
			const reason = reasonMessage
				? reasonMessage
				: socketErrorStatusCodes[code] || 'Unknown reason';
			if (this._pingTimeoutId) {
				clearTimeout(this._pingTimeoutId);
			}
			this.emit(EVENT_CLOSE_INBOUND, {
				peerInfo,
				code,
				reason,
			});
		};
		this._sendPing = () => {
			const pingStart = Date.now();
			this._socket.emit(EVENT_PING, undefined, () => {
				this._latency = Date.now() - pingStart;
				this._pingTimeoutId = setTimeout(this._sendPing, getRandomPingDelay());
			});
		};
		this._pingTimeoutId = setTimeout(this._sendPing, getRandomPingDelay());
		this._socket = peerSocket;
		this._bindHandlersToInboundSocket(this._socket);
	}

	set socket(scServerSocket) {
		this._unbindHandlersFromInboundSocket(this._socket);
		this._socket = scServerSocket;
		this._bindHandlersToInboundSocket(this._socket);
	}

	disconnect(code = 1000, reason) {
		super.disconnect(code, reason);
		this._unbindHandlersFromInboundSocket(this._socket);
	}

	// All event handlers for the inbound socket should be bound in this method.
	_bindHandlersToInboundSocket(inboundSocket) {
		inboundSocket.on('close', this._handleInboundSocketClose);
		inboundSocket.on('error', this._handleInboundSocketError);
		inboundSocket.on('message', this._handleWSMessage);

		// Bind RPC and remote event handlers
		inboundSocket.on(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.on(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
		inboundSocket.on('postBlock', this._handleRawLegacyMessagePostBlock);
		inboundSocket.on(
			'postSignatures',
			this._handleRawLegacyMessagePostSignatures,
		);
		inboundSocket.on(
			'postTransactions',
			this._handleRawLegacyMessagePostTransactions,
		);
	}

	// All event handlers for the inbound socket should be unbound in this method.
	_unbindHandlersFromInboundSocket(inboundSocket) {
		inboundSocket.off('close', this._handleInboundSocketClose);
		inboundSocket.off('message', this._handleWSMessage);

		// Unbind RPC and remote event handlers
		inboundSocket.off(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.off(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
		inboundSocket.off('postBlock', this._handleRawLegacyMessagePostBlock);
		inboundSocket.off(
			'postSignatures',
			this._handleRawLegacyMessagePostSignatures,
		);
		inboundSocket.off(
			'postTransactions',
			this._handleRawLegacyMessagePostTransactions,
		);
	}
}

module.exports = {
	EVENT_CLOSE_INBOUND,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_PING,
	InboundPeer,
};
