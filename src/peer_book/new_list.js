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

const DEFAULT_EVICTION_THRESHOLD_TIME = 86400000; // Milliseconds in a day

const { CustomPeerInfo, PeerList, PeerListConfig } = require('./peer_list');

class NewList extends PeerList {
  constructor({
    evictionThresholdTime,
    peerBucketCount,
    peerBucketSize,
    secret,
    peerType,
  }) {
    super({
      secret,
      peerBucketCount,
      peerBucketSize,
      peerType,
    });

    this._evictionThresholdTime = evictionThresholdTime
      ? evictionThresholdTime
      : DEFAULT_EVICTION_THRESHOLD_TIME;
  }

  get newPeerConfig() {
    return {
      ...this.peerListConfig,
      evictionThresholdTime: this._evictionThresholdTime,
    };
  }

  // Extend eviction of NewPeers
  evictPeerFromBucket(bucketId) {
    const bucket = this.peerMap.get(bucketId);
    if (!bucket) {
      return undefined;
    }

    // First eviction strategy
    const evictedPeerBasedOnTime = this._evictPeerBasedOnTimeInBucket(bucketId);

    if (evictedPeerBasedOnTime) {
      return evictedPeerBasedOnTime;
    }

    // Second eviction strategy: Default eviction based on base class
    return this.evictRandomlyFromBucket(bucketId);
  }

  // Evict a peer when a bucket is full based on the time of residence in a bucket
  _evictPeerBasedOnTimeInBucket(bucketId) {
    const bucket = this.peerMap.get(bucketId);
    if (!bucket) {
      return undefined;
    }

    for (const [peerId, peer] of bucket) {
      const timeDifference = Math.round(
        Math.abs(peer.dateAdded.getTime() - new Date().getTime()),
      );

      if (timeDifference >= this._evictionThresholdTime) {
        bucket.delete(peerId);

        return peer;
      }
    }

    return undefined;
  }
}

module.exports = {
  NewList
};
