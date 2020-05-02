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

const { RPCResponseAlreadySentError } = require('./errors');

class P2PRequest {
	constructor(options, respondCallback) {
		this._procedure = options.procedure;
		this._data = options.data;
		this._peerId = options.id;
		this._rate = options.rate;
		options.productivity.requestCounter += 1;
		this._respondCallback = (responseError, responsePacket) => {
			if (this._wasResponseSent) {
				throw new RPCResponseAlreadySentError(
					`A response has already been sent for the request procedure <<${
						options.procedure
					}>>`,
				);
			}
			this._wasResponseSent = true;
			// We assume peer performed useful work and update peer response rate
			if (!responseError && responsePacket) {
				options.productivity.lastResponded = Date.now();
				options.productivity.responseCounter += 1;
				options.productivity.responseRate =
					options.productivity.responseCounter /
					options.productivity.requestCounter;
			}
			respondCallback(responseError, responsePacket);
		};
		this._wasResponseSent = false;
	}

	get procedure() {
		return this._procedure;
	}

	get data() {
		return this._data;
	}

	get rate() {
		return this._rate;
	}

	get peerId() {
		return this._peerId;
	}

	get wasResponseSent() {
		return this._wasResponseSent;
	}

	end(responseData) {
		const responsePacket = {
			data: responseData,
		};
		this._respondCallback(undefined, responsePacket);
	}

	error(responseError) {
		this._respondCallback(responseError);
	}
}

module.exports = {
	P2PRequest
};
