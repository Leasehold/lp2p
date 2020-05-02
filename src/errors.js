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

class PeerInboundHandshakeError extends Error {
	constructor(
		message,
		statusCode,
		remoteAddress,
		handshakeURL,
	) {
		super(message);
		this.name = 'PeerInboundHandshakeError';
		this.statusCode = statusCode;
		this.remoteAddress = remoteAddress;
		this.handshakeURL = handshakeURL;
	}
}

class PeerOutboundConnectionError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.name = 'PeerOutboundConnectError';
		this.statusCode = statusCode;
	}
}

class RPCResponseError extends Error {
	constructor(message, peerId) {
		super(message);
		this.name = 'RPCResponseError';
		this.peerId = peerId;
	}
}

class FetchPeerStatusError extends Error {
	constructor(message) {
		super(message);
		this.name = 'FetchPeerStatusError';
	}
}

class InvalidRPCResponseError extends Error {
	constructor(message) {
		super(message);
		this.name = 'InvalidRPCResponseError';
	}
}

class RPCResponseAlreadySentError extends Error {
	constructor(message) {
		super(message);
		this.name = 'ResponseAlreadySentError';
	}
}

class InvalidPeerError extends Error {
	constructor(message) {
		super(message);
		this.name = 'InvalidPeerError';
	}
}

class RequestFailError extends Error {
	constructor(
		message,
		response,
		peerId,
		peerVersion,
	) {
		super(message);
		this.name = 'RequestFailError';
		// The request was made and the peer responded with error
		this.response = response || new Error(message);
		this.peerId = peerId || '';
		this.peerVersion = peerVersion || '';
		this.message = peerId
			? `${this.message}: Peer Id: ${this.peerId}: Peer Version: ${
					this.peerVersion
			  }`
			: message;
	}
}

class SendFailError extends Error {
	constructor(message) {
		super(message);
		this.name = 'SendFailError';
	}
}

class InvalidRPCRequestError extends Error {
	constructor(message) {
		super(message);
		this.name = 'InvalidRPCRequestError';
	}
}

class InvalidProtocolMessageError extends Error {
	constructor(message) {
		super(message);
		this.name = 'InvalidProtocolMessageError';
	}
}

module.exports = {
	PeerInboundHandshakeError,
	PeerOutboundConnectionError,
	RPCResponseError,
	FetchPeerStatusError,
	InvalidRPCResponseError,
	RPCResponseAlreadySentError,
	InvalidPeerError,
	RequestFailError,
	SendFailError,
	InvalidRPCRequestError,
	InvalidProtocolMessageError,
};
