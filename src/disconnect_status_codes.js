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

const INVALID_CONNECTION_URL_CODE = 4501;
const INVALID_CONNECTION_URL_REASON =
	'Peer did not provide a valid URL as part of the WebSocket connection';

const INVALID_CONNECTION_QUERY_CODE = 4502;
const INVALID_CONNECTION_QUERY_REASON =
	'Peer did not provide valid query parameters as part of the WebSocket connection';

const INVALID_CONNECTION_SELF_CODE = 4101;
const INVALID_CONNECTION_SELF_REASON = 'Peer cannot connect to itself';

const INCOMPATIBLE_NETWORK_CODE = 4102;
const INCOMPATIBLE_NETWORK_REASON = 'Peer nethash did not match our own';

const INCOMPATIBLE_PROTOCOL_VERSION_CODE = 4103;
const INCOMPATIBLE_PROTOCOL_VERSION_REASON =
	'Peer has incompatible protocol version';

const INCOMPATIBLE_PEER_CODE = 4104;
const INCOMPATIBLE_PEER_UNKNOWN_REASON =
	'Peer is incompatible with the node for unknown reasons';

const FORBIDDEN_CONNECTION = 4403;
const FORBIDDEN_CONNECTION_REASON = 'Peer is not allowed to connect';

const DUPLICATE_CONNECTION = 4404;
const DUPLICATE_CONNECTION_REASON = 'Peer has a duplicate connection';

const EVICTED_PEER_CODE = 4418;

module.exports = {
	INVALID_CONNECTION_URL_CODE,
	INVALID_CONNECTION_URL_REASON,
	INVALID_CONNECTION_QUERY_CODE,
	INVALID_CONNECTION_QUERY_REASON,
	INVALID_CONNECTION_SELF_CODE,
	INVALID_CONNECTION_SELF_REASON,
	INCOMPATIBLE_NETWORK_CODE,
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_CODE,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
	INCOMPATIBLE_PEER_CODE,
	INCOMPATIBLE_PEER_UNKNOWN_REASON,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	DUPLICATE_CONNECTION,
	DUPLICATE_CONNECTION_REASON,
	EVICTED_PEER_CODE,
};
