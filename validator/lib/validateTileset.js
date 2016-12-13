'use strict';

var Promise = require('bluebird');
var Cesium = require('cesium');
var defined = Cesium.defined;

module.exports = validateTileset;

/**
 * Walks down the tree represented by the JSON object and checks if it is a valid tileset.
 *
 * @param {Object} tileset The JSON object representing the tileset.
 * @return {Promise} A promise that resolves with two parameters - (1) a boolean for whether the tileset is valid
 *                                                                 (2) the error message if the tileset is not valid.
 *
 */
function validateTileset(tileset) {
    return new Promise(function(resolve) {
        validateNode(tileset.root, tileset, resolve);
    });
}

function validateNode(root, parent, resolve) {
    var stack = [];
    stack.push({
        node: root,
        parent: parent
    });

    while (stack.length > 0) {
        var node = stack.pop();
        var tile = node.node;
        var nodeParent = node.parent;

        if (defined(tile.content)) {
            if (defined(tile.content.boundingVolume)) {
                var region = tile.content.boundingVolume.region;
                var parentRegion = tile.boundingVolume.region;
                for (var i = 0; i < region.length; i++) {
                    if (region[i] > parentRegion[i]) {
                        return resolve({
                            result: false,
                            message: 'Child occupies region greater than parent'
                        });
                    }
                }
            }
        }

        if (tile.geometricError > nodeParent.geometricError) {
            return resolve({
                result : false,
                message : 'Child has geometricError greater than parent'
            });
        }

        if (defined(tile.children)) {
            var length = tile.children.length;
            for (var j = 0; j < length; j++) {
                stack.push({
                    node: tile.children[j],
                    parent: tile
                });
            }
        }
    }

    return resolve({
        result : true,
        message : 'Tileset is valid'
    });
}
