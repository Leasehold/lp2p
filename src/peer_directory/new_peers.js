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
const { constructPeerIdFromPeerInfo, getBucket, PEER_TYPE } = require('../utils');

const DEFAULT_NEW_PEER_BUCKET_COUNT = 128;
const DEFAULT_NEW_PEER_BUCKET_SIZE = 32;
const DEFAULT_EVICTION_THRESHOLD_TIME = 86400000; // Milliseconds in a day -> hours*minutes*seconds*milliseconds;

class NewPeers {
	constructor({
		evictionThresholdTime: eligibleDaysForEviction,
		newPeerBucketSize,
		newPeerBucketCount,
		secret,
	}) {
		this._newPeerBucketSize = newPeerBucketSize
			? newPeerBucketSize
			: DEFAULT_NEW_PEER_BUCKET_SIZE;
		this._newPeerBucketCount = newPeerBucketCount
			? newPeerBucketCount
			: DEFAULT_NEW_PEER_BUCKET_COUNT;
		this._evictionThresholdTime = eligibleDaysForEviction
			? eligibleDaysForEviction
			: DEFAULT_EVICTION_THRESHOLD_TIME;
		this._secret = secret;
		this._newPeerMap = new Map();
		// Initialize the Map with all the buckets
		for (const bucketId of [...new Array(this._newPeerBucketCount).keys()]) {
			this._newPeerMap.set(bucketId, new Map());
		}
	}

	get newPeerConfig() {
		return {
			newPeerBucketSize: this._newPeerBucketSize,
			newPeerBucketCount: this._newPeerBucketCount,
			secret: this._secret,
		};
	}

	newPeersList() {
		const peersListMap = [];

		for (const peerMap of [...this._newPeerMap.values()]) {
			for (const peer of [...peerMap.values()]) {
				peersListMap.push(peer.peerInfo);
			}
		}

		return peersListMap;
	}

	getBucketId(ipAddress) {
		return getBucket({
			secret: this._secret,
			peerType: PEER_TYPE.NEW_PEER,
			targetAddress: ipAddress,
		});
	}

	updatePeer(peerInfo) {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._newPeerMap.get(bucketId);

		if (!bucket) {
			return false;
		}
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		const foundPeer = bucket.get(incomingPeerId);
		if (!foundPeer) {
			return false;
		}
		const updatedNewPeerInfo = {
			peerInfo: { ...foundPeer.peerInfo, ...peerInfo },
			dateAdded: foundPeer.dateAdded,
		};

		bucket.set(incomingPeerId, updatedNewPeerInfo);
		this._newPeerMap.set(bucketId, bucket);

		return true;
	}

	removePeer(peerInfo) {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._newPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		if (bucket && bucket.get(incomingPeerId)) {
			const success = bucket.delete(incomingPeerId);
			this._newPeerMap.set(bucketId, bucket);

			return success;
		}

		return false;
	}

	getPeer(peerInfo) {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._newPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		if (!bucket) {
			return undefined;
		}
		const newPeer = bucket.get(incomingPeerId);

		return newPeer ? newPeer.peerInfo : undefined;
	}

	// Addition of peer can also result in peer eviction if the bucket of the incoming peer is already full based on evection strategy.
	addPeer(peerInfo) {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._newPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		if (!bucket) {
			return {
				success: false,
				isEvicted: false,
			};
		}

		if (bucket && bucket.get(incomingPeerId)) {
			return {
				success: false,
				isEvicted: false,
			};
		}

		const newPeerInfo = {
			peerInfo,
			numOfConnectionFailures: 0,
			dateAdded: new Date(),
		};

		if (bucket.size < this._newPeerBucketSize) {
			bucket.set(incomingPeerId, newPeerInfo);
			this._newPeerMap.set(bucketId, bucket);

			return {
				success: true,
				isEvicted: false,
			};
		}

		const evictedPeer = this._evictPeer(bucketId);
		bucket.set(incomingPeerId, newPeerInfo);
		this._newPeerMap.set(bucketId, bucket);

		return {
			success: true,
			isEvicted: true,
			evictedPeer: evictedPeer.peerInfo,
		};
	}

	// This action is called when a peer is disconnected
	failedConnectionAction(incomingPeerInfo) {
		const success = this.removePeer(incomingPeerInfo);

		return success;
	}

	_evictPeer(bucketId) {
		const peerList = this._newPeerMap.get(bucketId);

		if (!peerList) {
			throw new Error(`No Peer list for bucket Id: ${bucketId}`);
		}

		// First eviction strategy
		const evictedPeerBasedOnTime = this._evictionBasedOnTimeInBucket(
			bucketId,
			peerList,
		);

		if (evictedPeerBasedOnTime) {
			return evictedPeerBasedOnTime;
		}

		// Second eviction strategy
		return this._evictionRandom(bucketId);
	}
	// Evict a peer when a bucket is full based on the time of residence in a peerlist
	_evictionBasedOnTimeInBucket(bucketId, peerList) {
		// tslint:disable-next-line:no-let
		let evictedPeer;

		[...this._newPeerMap.values()].forEach(peersMap => {
			[...peersMap.keys()].forEach(peerId => {
				const peer = peersMap.get(peerId);

				if (!peer) {
					return;
				}

				const timeDifference = Math.round(
					Math.abs(peer.dateAdded.getTime() - new Date().getTime()),
				);

				if (timeDifference >= this._evictionThresholdTime) {
					peerList.delete(peerId);
					this._newPeerMap.set(bucketId, peerList);
					evictedPeer = peer;
				}
			});
		});

		return evictedPeer;
	}
	// If there are no peers which are old enough to be evicted based on number of days then pick a peer randomly and evict.
	_evictionRandom(bucketId) {
		const peerList = this._newPeerMap.get(bucketId);
		if (!peerList) {
			throw new Error(`No Peers exist for bucket Id: ${bucketId}`);
		}

		const randomPeerIndex = Math.floor(Math.random() * this._newPeerBucketSize);
		const randomPeerId = Array.from(peerList.keys())[randomPeerIndex];
		const randomPeer = Array.from(peerList.values())[randomPeerIndex];
		peerList.delete(randomPeerId);
		this._newPeerMap.set(bucketId, peerList);

		return randomPeer;
	}
}

module.exports = {
	DEFAULT_NEW_PEER_BUCKET_COUNT,
	DEFAULT_NEW_PEER_BUCKET_SIZE,
	DEFAULT_EVICTION_THRESHOLD_TIME,
	NewPeers,
};
