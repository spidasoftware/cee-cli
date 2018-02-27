'use strict';

/*
 * Loads and caches a client data file.  Call loadClientItems(file) or
 * createClientItems(obj) to parse and cache client items.  Then call
 * .clientItemsForStructure(structure) to get client items referenced in the
 * structure.
 */

const _ = require('lodash');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const { hash } = require('./hasher');

const METERS_PER_FOOT = 0.3048;
const METER_EPSILON = 1e-3;
 
const clientItemTypeMap = {
    poles: 'poles',
    pole: 'poles',
    foundations: 'foundations',
    equipments: 'equipments',
    wires: 'wires',
    guys: 'wires',
    spanGuys: 'wires',
    insulators: 'insulators',
    anchors: 'anchors',
    pushBraces: 'braces',
    braces: 'braces',
    sidewalkBraces: 'braces',
    crossArms: 'crossArms',
    assemblies: 'assemblies'
};

function loadClientData(file) {
    return fs.readFileAsync(file)
        .then(JSON.parse)
        .then(createClientItems);
}

//Determines what criteria to use when searching for a structure
function lookupCriteria(type, structure) {
    const lookup = {};
    if (structure.clientItemVersion) {
        lookup.version = structure.clientItemVersion;
    }

    const clientItem = structure.clientItem;
    if (clientItem) {
        if (typeof clientItem === 'string') {
            if (type === 'foundations') {
                lookup.name = clientItem;
            } else if (type === 'assemblies') {
                lookup.code = clientItem;
            } else {
                lookup.size = clientItem;
            }
        } else {
            for(let k of Object.keys(clientItem)) {
                //Handle equipment type maps to type.name
                if (type === 'equipments' && k === 'type') {
                    lookup['type.name']=clientItem[k];
                } else {
                    lookup[k]=clientItem[k];
                }
            }
        }
    }

    //ClientItemAliasId is for wires prior to 2018-02-22
    const clientItemAlias = structure.clientItemAlias || structure.clientItemAliasId;
    if (clientItemAlias) {
        lookup.alias = clientItemAlias;
    }

    return lookup;
}

function mergeClientItems(dest, source) {
    return _.mergeWith(dest, source, (destVal, srcVal) => {
        if (!destVal) {
            return srcVal;
        } else {
            for (let s of srcVal) {
                if (!destVal.includes(s)) {
                    destVal.push(s);
                }
            }
        }
        return destVal;
    });
}

function meterValue(m) {
    if (m.unit === 'METRE') {
        return m.value;
    } else if (m.unit == 'FOOT') {
        return m.value * METERS_PER_FOOT;
    } else {
        throw `Unknown unit: ${m.unit}`
    }
}


function measurableEquals(a,b) {
    return Math.abs(meterValue(a)-meterValue(b)) < METER_EPSILON;
}

function isStrengthCase(analysisCase) {
    return !analysisCase.type;
}

function loadClientItemVersions(clientData) {
    const clientItemVersions = {};

    for (let k of Object.keys(clientData)) {
        for (let clientItem of clientData[k]) {
            clientItemVersions[hash(clientItem)] = clientItem
        }
    }

    return clientItemVersions;
}

function extractAnalysisCases(clientData) {
    const load = {};
    const strength = {};

    if (clientData.analysisCases) {
        for (let analysisCase of analysisCases) {
            if (isStrengthCase(analysisCase)) {
                strength[analysisCase.name]=analysisCase;
            } else {
                load[analysisCase.name]=analysisCase;
            }
        }

        delete clientData.analysisCases;
    }

    return { load, strength };
}

const ClientData = {
    findByVersion(version) {
        return this.clientItemVersions[version];
    },

    find(type, by) {
        let item;
        //First lookup by version id
        if (by.version) {
            item = this.findByVersion(by.version);
        } 

        //Save off alias in case we can't find a matching item
        const alias = by.alias;
        
        if (!item) {
            //We don't want to match on version or alias here
            by = _.omit(by,['version','alias']);
            if (Object.keys(by).length > 0) {
                item = this.clientData[type].find(ci =>
                    Object.keys(by).every(k => {
                        //if the idividual property is an object then check if it is a measureable
                        //if it is a measurable use measurable compare, otherwise do a deep compare
                        const ciProp = _.get(ci,k);
                        if (typeof ciProp === 'object') {
                            if (ciProp.unit) {
                                return measurableEquals(ciProp, by[k]);
                            } else {
                                return _.isEqual(ciProp, by[k]);
                            }
                        } else {
                            return ciProp === by[k];
                        }
                    })
                );
            }
        }

        //If we didn't find yet look for a matching alias
        if (!item && alias) {
            item = this.clientData[type].find(ci =>
                ci.aliases && ci.aliases.some(ciAlias => ciAlias.id === alias)
            );
        }

        return item;

    },

    findOneOf(types, by) {
        for (let type of types) {
            const item = this.find(type, by);
            if (item) {
                return {
                    type: [item]
                };
            }
        }
    },

    clientItemsForStructure(structure) {
        const clientItems = {};
        
        _.forEach(structure,(components, type) => {
            if (clientItemTypeMap[type]) { 
                if (Array.isArray(components)) {
                    for(let component of components) {
                        mergeClientItems(clientItems, this.clientItemsForType(type, component));
                    }
                } else {
                    //This is for pole
                    mergeClientItems(clientItems, this.clientItemsForType(type, components));
                }
            }
        });

        return clientItems;
    },

    clientItemsForType(type, component) {
        const lookupType = clientItemTypeMap[type];
        const criteria = lookupCriteria(lookupType, component);
        let clientItems;

        if (lookupType === 'assemblies') {
            const assemblyClientItem = this.find('assemblies', criteria);

            if (!assemblyClientItem) {
                throw `Could not find assembly for ${JSON.stringify(criteria)}`;
            }

            clientItems = this.clientItemsForStructure(assemblyClientItem.assemblyStructure);

            if (component.wireEndPoints) {
                for (let wep of component.wireEndPoints) {
                    for (let wireType of Object.keys(wep.wires)) {
                        const size = wep.wireType[wireType];
                        mergeClientItems(clientItems, {
                            wires: [ this.find('wires', { size, alias: size }) ]
                        });
                    }
                };
            }

            if (component.support) {
                const inputAssemblyClientItems = {}
                const support = component.support;
                const clientItem = support.supportItem;

                mergeClientItems(inputAssemblyClientItems, this.findOneOf(['assemblies','anchors','wires'], {
                    alias: clientItem,
                    size: clientItem,
                    code: clientItem
                }));

                for (let attachment of support.attachments) {
                    const attachmentItem = attachment.attachmentItem;
                    mergeClientItems(inputAssemblyClientItems, this.findOneOf(['assemblies','wires'], {
                        alias: attachmentItem,
                        code: attachmentItem,
                        size: attachmentItem
                    }));
                }

                const subAssemblies = inputAssemblyClientItems.assemblies;
                if (subAssemblies) {
                    for (let assembly of subAssemblies) {
                        mergeClientItems(inputAssemblyClientItems, this.clientItemsForStructure(assembly.assemblyStructure));
                    }
                }

                mergeClientItems(clientItems, inputAssemblyClientItems);
            }

            mergeClientItems(clientItems, { assemblies: [ assemblyClientItem ] });
        } else {
            const item = this.find(lookupType, criteria);

            //No client item on a wire in an assembly is ok
            if (!item && lookupType !== 'wires') {
                throw `Could not find item in ${lookupType} for ${component.id || component.externalId} matching: ${JSON.stringify(criteria)}`;
            }

            clientItems = {};

            if (item) {
                clientItems[lookupType] = [item];
            }
        }

        return clientItems;
    },

    lookupAnalysisCase(type,name) {
        return this.analysisCases[type][name];
    }
};

function createClientData(clientDataJson) {

    return _.assign({
        clientData: clientDataJson,
        clientItemVersions: loadClientItemVersions(clientDataJson),
        analysisCases: extractAnalysisCases(clientDataJson)
    }, ClientData);

}

module.exports = {
    loadClientData,
    createClientData
};
