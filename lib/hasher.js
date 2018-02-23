const crypto = require('crypto');

const START_OBJ = '{';
const END_OBJ = '}';
const SEP_OBJ = ',';
const START_ARR= '[';
const END_ARR = ']';
const SEP_ARR = ',';
const PROP_SEP = ':';
const QUOTE = '"';
const NULL = 'null';

//Public
function numberFormatter(num) {
    return num.toExponential(12).replace(/\.?0+e/,'e').replace(/e\+?/,'E');
}

function hash(obj) {
    delete obj.id;
    delete obj._id;
    delete obj.version;

    return crypto.createHash('md5').update(serialize(obj)).digest('hex');
}

function serialize(obj) {
    const tokens = [];
    serializeAny(obj,tokens);
    return tokens.join('');
}

//Private
function serializeAny(obj, tokens) {
    if (obj === null) {
        tokens.push(NULL);
    } else if (Array.isArray(obj)) {
        serializers.array(obj,tokens);
    } else {
        const type = typeof obj;
        const serializer = serializers[type];

        if (serializers) {
            serializer(obj,tokens);
        } else {
            throw "I don't know how to serialize a ${type}";
        }
    }
}

function sortKey(o) {
    if (typeof o === 'object') {
        if (o.id) {
            return String(o.id);
        } else {
            return serialize(o);
        }
    } else {
        return String(o);
    }
}

function setSorter(a,b) {
    return sortKey(a).localeCompare(sortKey(b));
}

const serializers = {
    array(a, tokens) {
        if (a.length > 0 && typeof a[0] === 'number') {
            serializers.list(a, tokens);
        } else {
            serializers.set(a, tokens);
        }
    },
    object(o, tokens) {
        tokens.push(START_OBJ);
        Object.keys(o).sort().forEach((key, i) => {
            if (i > 0) {
                tokens.push(SEP_OBJ);
            }
            serializers.string(key, tokens);
            tokens.push(PROP_SEP);
            serializeAny(o[key],tokens);
        });
        tokens.push(END_OBJ);
    },
    number(n, tokens) {
        tokens.push(String(numberFormatter(n)));
    },
    string(s, tokens) {
        tokens.push(JSON.stringify(s));
    },
    boolean(b, tokens) {
        tokens.push(JSON.stringify(b));
    },
    list(l, tokens) {
        tokens.push(START_ARR);
        l.forEach((v,i) => {
            if (i > 0) {
                tokens.push(SEP_ARR);
            }
            serializeAny(v, tokens);
        });
        tokens.push(END_ARR);
    },
    set(s, tokens) {
        serializers.list(s.sort(setSorter), tokens);
    }
}

module.exports = { hash, serialize, numberFormatter };
