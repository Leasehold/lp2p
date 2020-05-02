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

const { NewPeers } = require('./new_peers');
const { TriedPeers } = require('./tried_peers');

class PeerBook {
	constructor({
		newPeerConfig,
		triedPeerConfig,
		secret,
	}) {
		this._newPeers = new NewPeers(newPeerConfig ? newPeerConfig : { secret });
		this._triedPeers = new TriedPeers(
			triedPeerConfig ? triedPeerConfig : { secret },
		);
	}

	get newPeers() {
		return this._newPeers.newPeersList();
	}

	get triedPeers() {
		return this._triedPeers.triedPeersList();
	}

	getAllPeers() {
		return [...this.newPeers, ...this.triedPeers];
	}
	/**
	 * Description: When a peer is downgraded for some reasons then new/triedPeers will trigger their failedConnectionAction,
	 * if the peer is deleted from newPeer that means the peer is completely deleted from the peer lists and need to inform the calling entity by returning true.
	 */
	downgradePeer(peerInfo) {
		if (this._newPeers.getPeer(peerInfo)) {
			if (this._newPeers.failedConnectionAction(peerInfo)) {
				return true;
			}
		}

		if (this._triedPeers.getPeer(peerInfo)) {
			const failed = this._triedPeers.failedConnectionAction(peerInfo);
			if (failed) {
				this.addPeer(peerInfo);
			}
		}

		return false;
	}
	// Move a peer from newPeer to triedPeer on events like on successful connection.
	upgradePeer(peerInfo) {
		if (this._triedPeers.getPeer(peerInfo)) {
			return true;
		}

		if (this._newPeers.getPeer(peerInfo)) {
			this._newPeers.removePeer(peerInfo);
			this._triedPeers.addPeer(peerInfo);

			return true;
		}

		return false;
	}
	// It will return evicted peer in the case a peer is removed from a peer list based on eviction strategy.
	addPeer(peerInfo) {
		if (
			this._triedPeers.getPeer(peerInfo) ||
			this._newPeers.getPeer(peerInfo)
		) {
			throw new Error('Peer already exists');
		}

		return this._newPeers.addPeer(peerInfo).evictedPeer;
	}

	removePeer(peerInfo) {
		if (this._triedPeers.getPeer(peerInfo)) {
			return this._triedPeers.removePeer(peerInfo);
		}

		if (this._newPeers.getPeer(peerInfo)) {
			return this._newPeers.removePeer(peerInfo);
		}

		return false;
	}

	getPeer(peerInfo) {
		const triedPeer = this._triedPeers.getPeer(peerInfo);
		if (this._triedPeers.getPeer(peerInfo)) {
			return triedPeer;
		}

		return this._newPeers.getPeer(peerInfo);
	}

	updatePeer(peerInfo) {
		if (this._triedPeers.getPeer(peerInfo)) {
			return this._triedPeers.updatePeer(peerInfo);
		}

		if (this._newPeers.getPeer(peerInfo)) {
			return this._newPeers.updatePeer(peerInfo);
		}

		return false;
	}
}

module.exports = {
	PeerBook,
};
