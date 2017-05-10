'use strict';
var Cesium = require('cesium');
var batchTableSchema = require('../specs/data/schema/batchTable.schema.json');
var featureTableSchema = require('../specs/data/schema/featureTable.schema.json');
var validateBatchTable = require('../lib/validateBatchTable');
var validateFeatureTable = require('../lib/validateFeatureTable');

var defined = Cesium.defined;
var DeveloperError = Cesium.DeveloperError;

module.exports = validateB3dm;

/**
 * Checks if provided buffer has valid b3dm tile content
 *
 * @param {Buffer} content - A buffer containing the contents of a b3dm tile.
 * @returns {Object} An object with two parameters - (1) a boolean for whether the tile is a valid b3dm tile
 *                                                   (2) a message to indicate which tile field is invalid, if any
 */
function validateB3dm(content) {
    if (!defined(content)) {
        throw new DeveloperError('b3dm content must be defined');
    }

    if (!Buffer.isBuffer(content)) {
        throw new DeveloperError('b3dm content must be of type buffer');
    }

    var headerByteLength = 28;
    if (content.length < headerByteLength) {
        return {
            result : false,
            message: 'b3dm tile header must be 28 bytes'
        };
    }

    var magic = content.toString('utf8', 0, 4);
    var version = content.readUInt32LE(4);
    var byteLength = content.readUInt32LE(8);

    if (magic !== 'b3dm') {
        return {
            result : false,
            message: 'b3dm tile has an invalid magic'
        };
    }

    if (version !== 1) {
        return {
            result : false,
            message: 'b3dm tile has an invalid version'
        };
    }

    if (byteLength !== content.length) {
        return {
            result : false,
            message: 'b3dm tile has the wrong byteLength'
        };
    }

    var offset = headerByteLength;
    var featureTableJSONByteLength = content.readUInt32LE(12);
    var featureTableBinaryByteLength = content.readUInt32LE(16);
    var batchTableJSONByteLength = content.readUInt32LE(20);
    var batchTableBinaryByteLength = content.readUInt32LE(24);

    var featureTableJSON;

    if (featureTableJSONByteLength > 0) {
        featureTableJSON = content.slice(offset, offset + featureTableJSONByteLength);
        offset +=  featureTableJSONByteLength;
        var featureTableBinary = content.slice(offset, offset + featureTableBinaryByteLength);
        offset +=  featureTableBinaryByteLength;

        if ((featureTableJSON.length === featureTableJSONByteLength) && (featureTableBinary.length === featureTableBinaryByteLength))  {
            featureTableJSON = JSON.parse(featureTableJSON.toString());
            var validFeatureTable = validateFeatureTable(featureTableSchema, featureTableJSON, featureTableBinary);
            if (!validFeatureTable.result) {
                return {
                    result : false,
                    message: validFeatureTable.message
                };
            }
        } else {
            return {
                result: false,
                message: 'b3dm has invalid feature table lengths'
            };
        }
    }

    if (batchTableJSONByteLength > 0) {
        var batchTableJSON = content.slice(offset, offset + batchTableJSONByteLength);
        offset +=  batchTableJSONByteLength;
        var batchTableBinary = content.slice(offset, offset + batchTableBinaryByteLength);

        if ((batchTableJSON.length === batchTableJSONByteLength) && (batchTableBinary.length === batchTableBinaryByteLength))  {
            batchTableJSON = JSON.parse(batchTableJSON.toString());

            if(!defined(featureTableJSON)) {
                return {
                    result: false,
                    message: 'batch table requires the BATCH_LENGTH global semantic but feature table is ' + featureTableJSON
                };
            }

            var batchLength= featureTableJSON.BATCH_LENGTH;
            var validBatchTable = validateBatchTable(batchTableSchema, batchTableJSON, batchTableBinary, batchLength);
            if (!validBatchTable.result) {
                return {
                    result: false,
                    message: validBatchTable.message
                };
            }
        } else {
            return {
                result: false,
                message: 'b3dm has invalid batch table lengths'
            };
        }
    }

    return {
        result: true,
        message: 'b3dm tile is a valid b3dm tile'
    };
}
