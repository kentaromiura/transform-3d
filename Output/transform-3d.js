(function (modules, global) {
    var cache = {}, require = function (id) {
            var module = cache[id];
            if (!module) {
                module = cache[id] = {};
                var exports = module.exports = {};
                modules[id].call(exports, require, module, exports, global);
            }
            return module.exports;
        };
    require('0');
}({
    '0': function (require, module, exports, global) {
        var Transform3dProto = Object.create(HTMLElement.prototype);
        var applyTransform = require('1');
        Transform3dProto.createdCallback = applyTransform;
        Transform3dProto.attributeChangedCallback = applyTransform;
        var div = document.createElement('div');
        div.innerHTML = '<style>transform-3d{display:block;}</style>';
        document.head.appendChild(div.firstChild);
        div = null;
        module.exports = document.registerElement('transform-3d', { prototype: Transform3dProto });
    },
    '1': function (require, module, exports, global) {
        var transform3d = require('2'), transform = require('3'), operations = require('4');
        module.exports = function applyTransforms() {
            var properties = [
                    'rotate',
                    'rotateX',
                    'rotateY',
                    'rotateZ',
                    'perspective',
                    'skew',
                    'skewX',
                    'skewY',
                    'translateX',
                    'translateY',
                    'translateZ',
                    'scale',
                    'scaleX',
                    'scaleY',
                    'scaleZ'
                ], transformation, i, max, property;
            if (!this._transform3d) {
                this._transform3d = new transform3d();
                this._identity = this._transform3d.compose();
            }
            transformation = this._transform3d;
            transformation.operations = [new operations.Matrix(this._identity)];
            for (i = 0, max = properties.length; i < max; i++) {
                property = properties[i];
                if (this.hasAttribute(property))
                    transformation[property](this.getAttribute(property) - 0);
            }
            transform(this, transformation.compose());
        };
    },
    '2': function (require, module, exports, global) {
        'use strict';
        module.exports = require('5');
    },
    '3': function (require, module, exports, global) {
        module.exports = function () {
            for (var props = [
                        'transform',
                        'webkitTransform',
                        'OTransform',
                        'msTransform',
                        'MozTransform'
                    ], i = 0, max = props.length; i < max; i++) {
                var prop = props[i];
                if (prop in document.documentElement.style) {
                    return function (element, transformation) {
                        element.style[prop] = transformation;
                    };
                }
            }
        }();
    },
    '4': function (require, module, exports, global) {
        'use strict';
        var prime = require('6');
        var Matrix3d = require('7');
        var Vector3 = require('8');
        var Vector4 = require('9');
        var epsilon = 0.0001;
        var tanDeg = function (degrees) {
            var radians = degrees * Math.PI / 180;
            return Math.tan(radians);
        };
        var TranslateOperation = exports.Translate = prime({
                type: 'Translate',
                constructor: function TranslateOperation(v3) {
                    this.value = v3 || new Vector3(0, 0, 0);
                },
                equals: function (translateOperation) {
                    return this.value.equals(translateOperation.value);
                },
                interpolate: function (translateOperation, delta) {
                    return new TranslateOperation(this.value.lerp(translateOperation.value, delta));
                },
                isIdentity: function () {
                    return this.value.equals(new Vector3(0, 0, 0));
                },
                compose: function () {
                    return new Matrix3d().translate(this.value);
                },
                toString: function () {
                    var v = this.value;
                    return 'translate3d(' + [
                        v.x + 'px',
                        v.y + 'px',
                        v.z + 'px'
                    ].join(', ') + ')';
                }
            });
        var ScaleOperation = exports.Scale = prime({
                type: 'Scale',
                constructor: function ScaleOperation(v3) {
                    this.value = v3 || new Vector3(1, 1, 1);
                },
                equals: function (scaleOperation) {
                    return this.value.equals(scaleOperation.value);
                },
                interpolate: function (scaleOperation, delta) {
                    return new ScaleOperation(this.value.lerp(scaleOperation.value, delta));
                },
                isIdentity: function () {
                    return this.value.equals(new Vector3(1, 1, 1));
                },
                compose: function () {
                    return new Matrix3d().scale(this.value);
                },
                toString: function () {
                    var v = this.value;
                    return 'scale3d(' + [
                        v.x,
                        v.y,
                        v.z
                    ].join(', ') + ')';
                }
            });
        var RotateOperation = exports.Rotate = prime({
                type: 'Rotate',
                constructor: function RotateOperation(v4) {
                    this.value = v4 || new Vector4(1, 1, 1, 0);
                },
                equals: function (to) {
                    return this.value.equals(to.value);
                },
                interpolate: function (rotateOperation, delta) {
                    var from = this.value;
                    var to = rotateOperation.value;
                    var fromAxis = new Vector3(from.x, from.y, from.z);
                    var toAxis = new Vector3(to.x, to.y, to.z);
                    if (fromAxis.equals(toAxis)) {
                        return new RotateOperation(new Vector4(from.x, from.y, from.z, from.w * (1 - delta) + to.w * delta));
                    }
                    var length1 = fromAxis.length();
                    var length2 = toAxis.length();
                    if (length1 > epsilon && length2 > epsilon) {
                        var dot = fromAxis.dot(toAxis);
                        var error = Math.abs(1 - dot * dot / (length1 * length2));
                        var result = error < epsilon;
                        if (result)
                            return new RotateOperation(new Vector4(to.x, to.y, to.z, dot > 0 ? from.w : -from.w));
                    }
                    var interpolated = from.angleToQuaternion(true).slerp(to.angleToQuaternion(true));
                    return new RotateOperation(interpolated.quaternionToAngle(true));
                },
                isIdentity: function () {
                    return this.value.equals(new Vector4(1, 1, 1, 0));
                },
                compose: function () {
                    return new Matrix3d().rotate(this.value.angleToQuaternion(true));
                },
                toString: function () {
                    var v = this.value;
                    return 'rotate3d(' + [
                        v.x,
                        v.y,
                        v.z,
                        v.w + 'deg'
                    ].join(', ') + ')';
                }
            });
        var PerspectiveOperation = exports.Perspective = prime({
                type: 'Perspective',
                constructor: function PerspectiveOperation(length) {
                    this.value = length || 0;
                },
                equals: function (perspectiveOperation) {
                    return this.value === perspectiveOperation.value;
                },
                interpolate: function (perspectiveOperation, delta) {
                    return new PerspectiveOperation(this.value * (1 - delta) + perspectiveOperation.value * delta);
                },
                isIdentity: function () {
                    return this.value === 0;
                },
                compose: function () {
                    var perspectiveMatrix = new Matrix3d();
                    var value = this.value;
                    if (value !== 0)
                        perspectiveMatrix.m34 = -1 / value;
                    return perspectiveMatrix;
                },
                toString: function () {
                    return 'perspective(' + this.value + ')';
                }
            });
        var SkewOperation = exports.Skew = prime({
                type: 'Skew',
                constructor: function SkewOperation(XY) {
                    this.value = XY || [
                        0,
                        0
                    ];
                },
                equals: function (skewOperation) {
                    var array1 = this.value;
                    var array2 = skewOperation.value;
                    return array1[0] === array2[0] && array1[1] === array2[1];
                },
                interpolate: function (skewOperation, delta) {
                    return new SkewOperation([
                        this[0] * (1 - delta) + skewOperation[0] * delta,
                        this[1] * (1 - delta) + skewOperation[1] * delta
                    ]);
                },
                isIdentity: function () {
                    var array = this.value;
                    return array[0] === 0 && array[1] === 0;
                },
                compose: function () {
                    var value = this.value;
                    var skewMatrix = new Matrix3d();
                    skewMatrix.m21 = tanDeg(value[0]);
                    skewMatrix.m12 = tanDeg(value[1]);
                    return skewMatrix;
                },
                toString: function () {
                    var v = this.value;
                    return 'skewX(' + v[0] + ') skewY(' + v[1] + ')';
                }
            });
        var MatrixOperation = exports.Matrix = prime({
                type: 'Matrix',
                constructor: function MatrixOperation(matrix, _decomposed) {
                    this.value = matrix || new Matrix3d();
                    this.decomposed = _decomposed || this.value.decompose();
                },
                equals: function (matrixOperation) {
                    return this.value.equals(matrixOperation.value);
                },
                interpolate: function (matrixOperation, delta) {
                    var decomposed = this.decomposed.interpolate(matrixOperation.decomposed, delta);
                    return new MatrixOperation(decomposed.compose(), decomposed);
                },
                isIdentity: function () {
                    return this.value.isIdentity();
                },
                compose: function () {
                    return this.value;
                },
                toString: function () {
                    return this.value.toString();
                }
            });
    },
    '5': function (require, module, exports, global) {
        'use strict';
        var prime = require('6');
        var Matrix3d = require('7');
        var Vector3 = require('8');
        var Vector4 = require('9');
        var operations = require('4');
        var slice_ = Array.prototype.slice;
        var Transform3d = prime({
                constructor: function Transform3d(operations) {
                    this.operations = operations || [];
                },
                append: function (operation) {
                    this.operations.push(operation);
                    return this;
                },
                isIdentity: function () {
                    var operations = this.operations;
                    for (var i = 0; i < operations.length; i++) {
                        if (!operations[i].isIdentity())
                            return false;
                    }
                    return true;
                },
                matrix3d: function () {
                    return this.append(new operations.Matrix(new Matrix3d(arguments)));
                },
                matrix: function (a, b, c, d, e, f) {
                    return this.matrix3d(a, b, c, d, e, f);
                },
                translate3d: function (x, y, z) {
                    return this.append(new operations.Translate(new Vector3(x, y, z)));
                },
                translate: function (x, y) {
                    if (y == null)
                        y = 0;
                    return this.translate3d(x, y, 0);
                },
                translateX: function (x) {
                    return this.translate(x, 0);
                },
                translateY: function (y) {
                    return this.translate(0, y);
                },
                translateZ: function (z) {
                    return this.translate3d(0, 0, z);
                },
                scale3d: function (x, y, z) {
                    return this.append(new operations.Scale(new Vector3(x, y, z)));
                },
                scale: function (x, y) {
                    if (y == null)
                        y = x;
                    return this.scale3d(x, y, 1);
                },
                scaleX: function (x) {
                    return this.scale(x, 1);
                },
                scaleY: function (y) {
                    return this.scale(1, y);
                },
                scaleZ: function (z) {
                    return this.scale3d(1, 1, z);
                },
                rotate3d: function (x, y, z, angle) {
                    return this.append(new operations.Rotate(new Vector4(x, y, z, angle)));
                },
                rotate: function (angle) {
                    return this.rotate3d(0, 0, 1, angle);
                },
                rotateX: function (angle) {
                    return this.rotate3d(1, 0, 0, angle);
                },
                rotateY: function (angle) {
                    return this.rotate3d(0, 1, 0, angle);
                },
                rotateZ: function (angle) {
                    return this.rotate3d(0, 0, 1, angle);
                },
                skew: function (x, y) {
                    if (y == null)
                        y = 0;
                    return this.append(new operations.Skew([
                        x,
                        y
                    ]));
                },
                skewX: function (x) {
                    return this.skew(x, 0);
                },
                skewY: function (y) {
                    return this.skew(0, y);
                },
                perspective: function (len) {
                    return this.append(new operations.Perspective(len));
                },
                interpolation: function (transform) {
                    return new TransformInterpolation(this, transform);
                },
                compose: function () {
                    var matrix = new Matrix3d();
                    var operations = this.operations;
                    for (var i = 0; i < operations.length; i++) {
                        matrix = matrix.concat(operations[i].compose());
                    }
                    return matrix;
                },
                toString: function () {
                    var string = [];
                    var operations = this.operations;
                    for (var i = 0; i < operations.length; i++) {
                        string.push(operations[i].toString());
                    }
                    return string.join(' ');
                }
            });
        var TransformInterpolation = prime({
                constructor: function TransformInterpolation(from, to) {
                    var operations1 = slice_.call(from.operations);
                    var operations2 = slice_.call(to.operations);
                    var length1 = operations1.length, length2 = operations2.length;
                    var operation1, operation2, i, interpolateTransform = true;
                    if (!length1 || from.isIdentity()) {
                        operations1 = [];
                        for (i = 0; i < length2; i++)
                            operations1.push(new operations[operations2[i].type]());
                        length1 = operations1.length;
                    } else if (!length2 || to.isIdentity()) {
                        operations2 = [];
                        for (i = 0; i < length1; i++)
                            operations2.push(new operations[operations1[i].type]());
                        length2 = operations2.length;
                    } else if (length1 === length2) {
                        for (i = 0; i < length1; i++) {
                            operation1 = operations1[i];
                            operation2 = operations2[i];
                            var type1 = operation1.type;
                            var type2 = operation2.type;
                            if (type1 !== type2) {
                                if (operation1.isIdentity()) {
                                    operations1.splice(i, 1, new operations[type2]());
                                } else if (operation2.isIdentity()) {
                                    operations1.splice(i, 1, new operations[type1]());
                                } else {
                                    interpolateTransform = false;
                                    break;
                                }
                            }
                        }
                    } else {
                        interpolateTransform = false;
                    }
                    if (interpolateTransform) {
                        this.from = operations1;
                        this.to = operations2;
                        this.length = length1;
                    } else {
                        this.from = [new operations.Matrix(from.compose())];
                        this.to = [new operations.Matrix(to.compose())];
                        this.length = 1;
                    }
                },
                step: function (delta) {
                    if (delta === 0)
                        return new Transform3d(this.from);
                    if (delta === 1)
                        return new Transform3d(this.to);
                    var interpolated = new Transform3d();
                    for (var i = 0; i < this.length; i++) {
                        var from = this.from[i];
                        var to = this.to[i];
                        var operation = from.equals(to) ? from : from.interpolate(to, delta);
                        interpolated.append(operation);
                    }
                    return interpolated;
                }
            });
        Transform3d.Interpolation = TransformInterpolation;
        module.exports = Transform3d;
    },
    '6': function (require, module, exports, global) {
        'use strict';
        var hasOwn = require('a'), mixIn = require('b'), create = require('c'), kindOf = require('d');
        var hasDescriptors = true;
        try {
            Object.defineProperty({}, '~', {});
            Object.getOwnPropertyDescriptor({}, '~');
        } catch (e) {
            hasDescriptors = false;
        }
        var hasEnumBug = !{ valueOf: 0 }.propertyIsEnumerable('valueOf'), buggy = [
                'toString',
                'valueOf'
            ];
        var verbs = /^constructor|inherits|mixin$/;
        var implement = function (proto) {
            var prototype = this.prototype;
            for (var key in proto) {
                if (key.match(verbs))
                    continue;
                if (hasDescriptors) {
                    var descriptor = Object.getOwnPropertyDescriptor(proto, key);
                    if (descriptor) {
                        Object.defineProperty(prototype, key, descriptor);
                        continue;
                    }
                }
                prototype[key] = proto[key];
            }
            if (hasEnumBug)
                for (var i = 0; key = buggy[i]; i++) {
                    var value = proto[key];
                    if (value !== Object.prototype[key])
                        prototype[key] = value;
                }
            return this;
        };
        var prime = function (proto) {
            if (kindOf(proto) === 'Function')
                proto = { constructor: proto };
            var superprime = proto.inherits;
            var constructor = hasOwn(proto, 'constructor') ? proto.constructor : superprime ? function () {
                    return superprime.apply(this, arguments);
                } : function () {
                };
            if (superprime) {
                mixIn(constructor, superprime);
                var superproto = superprime.prototype;
                var cproto = constructor.prototype = create(superproto);
                constructor.parent = superproto;
                cproto.constructor = constructor;
            }
            if (!constructor.implement)
                constructor.implement = implement;
            var mixins = proto.mixin;
            if (mixins) {
                if (kindOf(mixins) !== 'Array')
                    mixins = [mixins];
                for (var i = 0; i < mixins.length; i++)
                    constructor.implement(create(mixins[i].prototype));
            }
            return constructor.implement(proto);
        };
        module.exports = prime;
    },
    '7': function (require, module, exports, global) {
        'use strict';
        module.exports = require('e');
    },
    '8': function (require, module, exports, global) {
        'use strict';
        var prime = require('6');
        var Vector3 = prime({
                constructor: function Vector3(x, y, z) {
                    this[0] = x || 0;
                    this[1] = y || 0;
                    this[2] = z || 0;
                },
                clone: function () {
                    return new Vector3(this[0], this[1], this[2]);
                },
                get x() {
                    return this[0];
                },
                get y() {
                    return this[1];
                },
                get z() {
                    return this[2];
                },
                equals: function (v3) {
                    return this[0] === v3[0] && this[1] === v3[1] && this[2] === v3[2];
                },
                length: function () {
                    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
                },
                normalize: function () {
                    var length = this.length();
                    if (length === 0)
                        return new Vector3();
                    return new Vector3(this[0] / length, this[1] / length, this[2] / length);
                },
                dot: function (v3) {
                    return this[0] * v3[0] + this[1] * v3[1] + this[2] * v3[2];
                },
                cross: function (v3) {
                    var x = this[0], y = this[1], z = this[2];
                    return new Vector3(y * v3[2] - z * v3[1], z * v3[0] - x * v3[2], x * v3[1] - y * v3[0]);
                },
                lerp: function (v3, delta) {
                    var scale1 = delta;
                    var scale2 = 1 - delta;
                    return v3.combine(this, scale1, scale2);
                },
                combine: function (v3, scale1, scale2) {
                    var result = new Vector3();
                    for (var i = 0; i < 3; i++)
                        result[i] = this[i] * scale1 + v3[i] * scale2;
                    return result;
                }
            });
        module.exports = Vector3;
    },
    '9': function (require, module, exports, global) {
        'use strict';
        var prime = require('6');
        var degToRad = function (degrees) {
            return degrees * Math.PI / 180;
        };
        var radToDeg = function (radians) {
            return radians * 180 / Math.PI;
        };
        var Vector4 = prime({
                constructor: function Vector4(x, y, z, w) {
                    this[0] = x || 0;
                    this[1] = y || 0;
                    this[2] = z || 0;
                    this[3] = w || 0;
                },
                clone: function () {
                    return new Vector4(this[0], this[1], this[2], this[3]);
                },
                get x() {
                    return this[0];
                },
                get y() {
                    return this[1];
                },
                get z() {
                    return this[2];
                },
                get w() {
                    return this[3];
                },
                equals: function (v3) {
                    return this[0] === v3[0] && this[1] === v3[1] && this[2] === v3[2] && this[3] === v3[3];
                },
                length: function () {
                    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2] + this[3] * this[3]);
                },
                dot: function (v4) {
                    return this[0] * v4[0] + this[1] * v4[1] + this[2] * v4[2] + this[3] * v4[3];
                },
                normalize: function () {
                    var length = this.length();
                    if (length === 0)
                        return new Vector4(0, 0, 0, 1);
                    var inv = 1 / length;
                    return new Vector4(this[0] * inv, this[1] * inv, this[2] * inv, this[3] * inv);
                },
                quaternionToAngle: function (deg) {
                    var v4 = this;
                    if (v4[3] > 1)
                        v4 = v4.normalize();
                    var w = 2 * Math.acos(v4[3]);
                    var s = Math.sqrt(1 - v4[3] * v4[3]);
                    if (s < 0.0001) {
                        return new Vector4(v4[0], v4[1], v4[2], w);
                    } else {
                        return new Vector4(v4[0] / s, v4[1] / s, v4[2] / s, deg ? radToDeg(w) : w);
                    }
                },
                angleToQuaternion: function (deg) {
                    var angle = deg ? degToRad(this[3]) : this[3];
                    var half = angle / 2, s = Math.sin(half);
                    return new Vector4(this[0] * s, this[1] * s, this[2] * s, Math.cos(half));
                },
                combine: function (v4, scale1, scale2) {
                    var result = new Vector4();
                    for (var i = 0; i < 4; i++)
                        result[i] = this[i] * scale1 + v4[i] * scale2;
                    return result;
                },
                lerp: function (v4, delta) {
                    var scale1 = delta;
                    var scale2 = 1 - delta;
                    return v4.combine(this, scale1, scale2);
                },
                slerp: function (v4q, delta) {
                    var interpolated = new Vector4();
                    var product = this.dot(v4q);
                    product = Math.min(Math.max(product, -1), 1);
                    var scale1 = 1;
                    if (product < 0) {
                        product = -product;
                        scale1 = -1;
                    }
                    var epsilon = 0.00001;
                    if (Math.abs(product - 1) < epsilon) {
                        for (var i = 0; i < 4; ++i)
                            interpolated[i] = this[i];
                        return interpolated;
                    }
                    var denom = Math.sqrt(1 - product * product);
                    var theta = Math.acos(product);
                    var w = Math.sin(delta * theta) * (1 / denom);
                    scale1 *= Math.cos(delta * theta) - product * w;
                    var scale2 = w;
                    return this.combine(v4q, scale1, scale2);
                }
            });
        module.exports = Vector4;
    },
    'a': function (require, module, exports, global) {
        function hasOwn(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        }
        module.exports = hasOwn;
    },
    'b': function (require, module, exports, global) {
        var forOwn = require('f');
        function mixIn(target, objects) {
            var i = 0, n = arguments.length, obj;
            while (++i < n) {
                obj = arguments[i];
                if (obj != null) {
                    forOwn(obj, copyProp, target);
                }
            }
            return target;
        }
        function copyProp(val, key) {
            this[key] = val;
        }
        module.exports = mixIn;
    },
    'c': function (require, module, exports, global) {
        var mixIn = require('b');
        function createObject(parent, props) {
            function F() {
            }
            F.prototype = parent;
            return mixIn(new F(), props);
        }
        module.exports = createObject;
    },
    'd': function (require, module, exports, global) {
        var _rKind = /^\[object (.*)\]$/, _toString = Object.prototype.toString, UNDEF;
        function kindOf(val) {
            if (val === null) {
                return 'Null';
            } else if (val === UNDEF) {
                return 'Undefined';
            } else {
                return _rKind.exec(_toString.call(val))[1];
            }
        }
        module.exports = kindOf;
    },
    'e': function (require, module, exports, global) {
        'use strict';
        var prime = require('6');
        var Vector3 = require('8');
        var Vector4 = require('9');
        var stringify = function (array, places) {
            if (places == null || places > 20)
                places = 20;
            var strings = [];
            for (var i = 0; i < array.length; i++)
                strings[i] = array[i].toFixed(10).replace(/\.?0+$/, '');
            return strings;
        };
        var TypeMask = {
                Identity: 0,
                Translate: 1,
                Scale: 2,
                Affine: 4,
                Perspective: 8,
                All: 15,
                Unknown: 128
            };
        var Matrix3d = prime({
                constructor: function Matrix3d() {
                    var values = arguments;
                    if (values.length === 1)
                        values = values[0];
                    if (!values.length)
                        values = [
                            1,
                            0,
                            0,
                            0,
                            0,
                            1,
                            0,
                            0,
                            0,
                            0,
                            1,
                            0,
                            0,
                            0,
                            0,
                            1
                        ];
                    var i = 0, j, k = 0;
                    if (values.length === 6) {
                        var a = values[0];
                        var b = values[1];
                        var c = values[2];
                        var d = values[3];
                        var e = values[4];
                        var f = values[5];
                        values = [
                            a,
                            b,
                            0,
                            0,
                            c,
                            d,
                            0,
                            0,
                            0,
                            0,
                            1,
                            0,
                            e,
                            f,
                            0,
                            1
                        ];
                    }
                    if (values.length !== 16)
                        throw new Error('invalid matrix');
                    for (i = 0; i < 4; i++) {
                        var col = this[i] = [];
                        for (j = 0; j < 4; j++) {
                            col[j] = values[k++];
                        }
                    }
                },
                get a() {
                    return this.m11;
                },
                get b() {
                    return this.m12;
                },
                get c() {
                    return this.m21;
                },
                get d() {
                    return this.m22;
                },
                get e() {
                    return this.m41;
                },
                get f() {
                    return this.m42;
                },
                set a(value) {
                    this.m11 = value;
                },
                set b(value) {
                    this.m12 = value;
                },
                set c(value) {
                    this.m21 = value;
                },
                set d(value) {
                    this.m22 = value;
                },
                set e(value) {
                    this.m41 = value;
                },
                set f(value) {
                    this.m42 = value;
                },
                get m11() {
                    return this[0][0];
                },
                get m12() {
                    return this[0][1];
                },
                get m13() {
                    return this[0][2];
                },
                get m14() {
                    return this[0][3];
                },
                get m21() {
                    return this[1][0];
                },
                get m22() {
                    return this[1][1];
                },
                get m23() {
                    return this[1][2];
                },
                get m24() {
                    return this[1][3];
                },
                get m31() {
                    return this[2][0];
                },
                get m32() {
                    return this[2][1];
                },
                get m33() {
                    return this[2][2];
                },
                get m34() {
                    return this[2][3];
                },
                get m41() {
                    return this[3][0];
                },
                get m42() {
                    return this[3][1];
                },
                get m43() {
                    return this[3][2];
                },
                get m44() {
                    return this[3][3];
                },
                set m11(value) {
                    this[0][0] = value;
                },
                set m12(value) {
                    this[0][1] = value;
                },
                set m13(value) {
                    this[0][2] = value;
                },
                set m14(value) {
                    this[0][3] = value;
                },
                set m21(value) {
                    this[1][0] = value;
                },
                set m22(value) {
                    this[1][1] = value;
                },
                set m23(value) {
                    this[1][2] = value;
                },
                set m24(value) {
                    this[1][3] = value;
                },
                set m31(value) {
                    this[2][0] = value;
                },
                set m32(value) {
                    this[2][1] = value;
                },
                set m33(value) {
                    this[2][2] = value;
                },
                set m34(value) {
                    this[2][3] = value;
                },
                set m41(value) {
                    this[3][0] = value;
                },
                set m42(value) {
                    this[3][1] = value;
                },
                set m43(value) {
                    this[3][2] = value;
                },
                set m44(value) {
                    this[3][3] = value;
                },
                get transX() {
                    return this[3][0];
                },
                get transY() {
                    return this[3][1];
                },
                get transZ() {
                    return this[3][2];
                },
                get scaleX() {
                    return this[0][0];
                },
                get scaleY() {
                    return this[1][1];
                },
                get scaleZ() {
                    return this[2][2];
                },
                get perspX() {
                    return this[0][3];
                },
                get perspY() {
                    return this[1][3];
                },
                get perspZ() {
                    return this[2][3];
                },
                set transX(value) {
                    this[3][0] = value;
                },
                set transY(value) {
                    this[3][1] = value;
                },
                set transZ(value) {
                    this[3][2] = value;
                },
                set scaleX(value) {
                    this[0][0] = value;
                },
                set scaleY(value) {
                    this[1][1] = value;
                },
                set scaleZ(value) {
                    this[2][2] = value;
                },
                set perspX(value) {
                    this[0][3] = value;
                },
                set perspY(value) {
                    this[1][3] = value;
                },
                set perspZ(value) {
                    this[2][3] = value;
                },
                get type() {
                    var m = this;
                    var mask = 0;
                    if (0 !== m.perspX || 0 !== m.perspY || 0 !== m.perspZ || 1 !== m[3][3]) {
                        return TypeMask.Translate | TypeMask.Scale | TypeMask.Affine | TypeMask.Perspective;
                    }
                    if (0 !== m.transX || 0 !== m.transY || 0 !== m.transZ) {
                        mask |= TypeMask.Translate;
                    }
                    if (1 !== m.scaleX || 1 !== m.scaleY || 1 !== m.scaleZ) {
                        mask |= TypeMask.Scale;
                    }
                    if (0 !== m[1][0] || 0 !== m[0][1] || 0 !== m[0][2] || 0 !== m[2][0] || 0 !== m[1][2] || 0 !== m[2][1]) {
                        mask |= TypeMask.Affine;
                    }
                    return mask;
                },
                is2d: function () {
                    var m = this;
                    return m.m31 === 0 && m.m32 === 0 && m.m13 === 0 && m.m14 === 0 && m.m23 === 0 && m.m24 === 0 && m.m33 === 1 && m.m34 === 0 && m.m43 === 0 && m.m44 === 1;
                },
                equals: function (m2) {
                    var m1 = this;
                    return;
                    m1.m11 === m2.m11 && m1.m12 === m2.m12 && m1.m13 === m2.m13 && m1.m14 === m2.m14 && m1.m21 === m2.m21 && m1.m22 === m2.m22 && m1.m23 === m2.m23 && m1.m24 === m2.m24 && m1.m31 === m2.m31 && m1.m32 === m2.m32 && m1.m33 === m2.m33 && m1.m34 === m2.m34 && m1.m41 === m2.m41 && m1.m42 === m2.m42 && m1.m43 === m2.m43 && m1.m44 === m2.m44;
                },
                clone: function () {
                    var m = this;
                    return new Matrix3d(m.m11, m.m12, m.m13, m.m14, m.m21, m.m22, m.m23, m.m24, m.m31, m.m32, m.m33, m.m34, m.m41, m.m42, m.m43, m.m44);
                },
                isIdentity: function () {
                    return this.type === TypeMask.Identity;
                },
                isTranslate: function () {
                    return !(this.type & ~TypeMask.Translate);
                },
                isScaleTranslate: function () {
                    return !(this.type & ~(TypeMask.Scale | TypeMask.Translate));
                },
                concat: function (m2) {
                    if (this.isIdentity())
                        return m2.clone();
                    if (m2.isIdentity())
                        return this.clone();
                    var m = new Matrix3d();
                    for (var j = 0; j < 4; j++) {
                        for (var i = 0; i < 4; i++) {
                            var value = 0;
                            for (var k = 0; k < 4; k++) {
                                value += this[k][i] * m2[j][k];
                            }
                            m[j][i] = value;
                        }
                    }
                    return m;
                },
                translate: function (v3) {
                    var translationMatrix = new Matrix3d();
                    translationMatrix.m41 = v3[0];
                    translationMatrix.m42 = v3[1];
                    translationMatrix.m43 = v3[2];
                    return this.concat(translationMatrix);
                },
                scale: function (v3) {
                    var m = new Matrix3d();
                    m.m11 = v3[0];
                    m.m22 = v3[1];
                    m.m33 = v3[2];
                    return this.concat(m);
                },
                rotate: function (v4q) {
                    var rotationMatrix = new Matrix3d();
                    var x = v4q[0];
                    var y = v4q[1];
                    var z = v4q[2];
                    var w = v4q[3];
                    rotationMatrix.m11 = 1 - 2 * (y * y + z * z);
                    rotationMatrix.m21 = 2 * (x * y - z * w);
                    rotationMatrix.m31 = 2 * (x * z + y * w);
                    rotationMatrix.m12 = 2 * (x * y + z * w);
                    rotationMatrix.m22 = 1 - 2 * (x * x + z * z);
                    rotationMatrix.m32 = 2 * (y * z - x * w);
                    rotationMatrix.m13 = 2 * (x * z - y * w);
                    rotationMatrix.m23 = 2 * (y * z + x * w);
                    rotationMatrix.m33 = 1 - 2 * (x * x + y * y);
                    return this.concat(rotationMatrix);
                },
                skew: function (v3) {
                    var skewMatrix = new Matrix3d();
                    skewMatrix[1][0] = v3[0];
                    skewMatrix[2][0] = v3[1];
                    skewMatrix[2][1] = v3[2];
                    return this.concat(skewMatrix);
                },
                perspective: function (v4) {
                    var perspectiveMatrix = new Matrix3d();
                    perspectiveMatrix.m14 = v4[0];
                    perspectiveMatrix.m24 = v4[1];
                    perspectiveMatrix.m34 = v4[2];
                    perspectiveMatrix.m44 = v4[3];
                    return this.concat(perspectiveMatrix);
                },
                map: function (v4) {
                    var result = new Vector4();
                    for (var i = 0; i < 4; i++) {
                        var value = 0;
                        for (var j = 0; j < 4; j++) {
                            value += this[j][i] * v4[j];
                        }
                        result[i] = value;
                    }
                    return result;
                },
                determinant: function () {
                    if (this.isIdentity())
                        return 1;
                    if (this.isScaleTranslate())
                        return this[0][0] * this[1][1] * this[2][2] * this[3][3];
                    var a00 = this[0][0];
                    var a01 = this[0][1];
                    var a02 = this[0][2];
                    var a03 = this[0][3];
                    var a10 = this[1][0];
                    var a11 = this[1][1];
                    var a12 = this[1][2];
                    var a13 = this[1][3];
                    var a20 = this[2][0];
                    var a21 = this[2][1];
                    var a22 = this[2][2];
                    var a23 = this[2][3];
                    var a30 = this[3][0];
                    var a31 = this[3][1];
                    var a32 = this[3][2];
                    var a33 = this[3][3];
                    var b00 = a00 * a11 - a01 * a10;
                    var b01 = a00 * a12 - a02 * a10;
                    var b02 = a00 * a13 - a03 * a10;
                    var b03 = a01 * a12 - a02 * a11;
                    var b04 = a01 * a13 - a03 * a11;
                    var b05 = a02 * a13 - a03 * a12;
                    var b06 = a20 * a31 - a21 * a30;
                    var b07 = a20 * a32 - a22 * a30;
                    var b08 = a20 * a33 - a23 * a30;
                    var b09 = a21 * a32 - a22 * a31;
                    var b10 = a21 * a33 - a23 * a31;
                    var b11 = a22 * a33 - a23 * a32;
                    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
                },
                normalize: function () {
                    var m44 = this.m44;
                    if (m44 === 0)
                        return false;
                    var normalizedMatrix = new Matrix3d();
                    var scale = 1 / m44;
                    for (var i = 0; i < 4; i++)
                        for (var j = 0; j < 4; j++)
                            normalizedMatrix[j][i] = this[j][i] * scale;
                    return normalizedMatrix;
                },
                decompose: function () {
                    var matrix = this.normalize();
                    if (!matrix)
                        return false;
                    var perspectiveMatrix = matrix.clone();
                    var i, j;
                    for (i = 0; i < 3; i++)
                        perspectiveMatrix[i][3] = 0;
                    perspectiveMatrix[3][3] = 1;
                    if (Math.abs(perspectiveMatrix.determinant()) < 1e-8)
                        return false;
                    var perspective;
                    if (matrix[0][3] !== 0 || matrix[1][3] !== 0 || matrix[2][3] !== 0) {
                        var rightHandSide = new Vector4(matrix[0][3], matrix[1][3], matrix[2][3], matrix[3][3]);
                        var inversePerspectiveMatrix = perspectiveMatrix.invert();
                        if (!inversePerspectiveMatrix)
                            return false;
                        var transposedInversePerspectiveMatrix = inversePerspectiveMatrix.transpose();
                        perspective = transposedInversePerspectiveMatrix.map(rightHandSide);
                    } else {
                        perspective = new Vector4(0, 0, 0, 1);
                    }
                    var translate = new Vector3();
                    for (i = 0; i < 3; i++)
                        translate[i] = matrix[3][i];
                    var row = [];
                    for (i = 0; i < 3; i++) {
                        var v3 = row[i] = new Vector3();
                        for (j = 0; j < 3; ++j)
                            v3[j] = matrix[i][j];
                    }
                    var scale = new Vector3();
                    scale[0] = row[0].length();
                    row[0] = row[0].normalize();
                    var skew = new Vector3();
                    skew[0] = row[0].dot(row[1]);
                    row[1] = row[1].combine(row[0], 1, -skew[0]);
                    scale[1] = row[1].length();
                    row[1] = row[1].normalize();
                    skew[0] /= scale[1];
                    skew[1] = row[0].dot(row[2]);
                    row[2] = row[2].combine(row[0], 1, -skew[1]);
                    skew[2] = row[1].dot(row[2]);
                    row[2] = row[2].combine(row[1], 1, -skew[2]);
                    scale[2] = row[2].length();
                    row[2] = row[2].normalize();
                    skew[1] /= scale[2];
                    skew[2] /= scale[2];
                    var pdum3 = row[1].cross(row[2]);
                    if (row[0].dot(pdum3) < 0) {
                        for (i = 0; i < 3; i++) {
                            scale[i] *= -1;
                            for (j = 0; j < 3; ++j)
                                row[i][j] *= -1;
                        }
                    }
                    var quaternion = new Vector4(0.5 * Math.sqrt(Math.max(1 + row[0][0] - row[1][1] - row[2][2], 0)), 0.5 * Math.sqrt(Math.max(1 - row[0][0] + row[1][1] - row[2][2], 0)), 0.5 * Math.sqrt(Math.max(1 - row[0][0] - row[1][1] + row[2][2], 0)), 0.5 * Math.sqrt(Math.max(1 + row[0][0] + row[1][1] + row[2][2], 0)));
                    if (row[2][1] > row[1][2])
                        quaternion[0] = -quaternion[0];
                    if (row[0][2] > row[2][0])
                        quaternion[1] = -quaternion[1];
                    if (row[1][0] > row[0][1])
                        quaternion[2] = -quaternion[2];
                    return new DecomposedMatrix(perspective, translate, quaternion, skew, scale);
                },
                invert: function () {
                    var a00 = this[0][0];
                    var a01 = this[0][1];
                    var a02 = this[0][2];
                    var a03 = this[0][3];
                    var a10 = this[1][0];
                    var a11 = this[1][1];
                    var a12 = this[1][2];
                    var a13 = this[1][3];
                    var a20 = this[2][0];
                    var a21 = this[2][1];
                    var a22 = this[2][2];
                    var a23 = this[2][3];
                    var a30 = this[3][0];
                    var a31 = this[3][1];
                    var a32 = this[3][2];
                    var a33 = this[3][3];
                    var b00 = a00 * a11 - a01 * a10;
                    var b01 = a00 * a12 - a02 * a10;
                    var b02 = a00 * a13 - a03 * a10;
                    var b03 = a01 * a12 - a02 * a11;
                    var b04 = a01 * a13 - a03 * a11;
                    var b05 = a02 * a13 - a03 * a12;
                    var b06 = a20 * a31 - a21 * a30;
                    var b07 = a20 * a32 - a22 * a30;
                    var b08 = a20 * a33 - a23 * a30;
                    var b09 = a21 * a32 - a22 * a31;
                    var b10 = a21 * a33 - a23 * a31;
                    var b11 = a22 * a33 - a23 * a32;
                    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
                    if (det === 0 || !isFinite(det))
                        return false;
                    var invdet = 1 / det;
                    b00 *= invdet;
                    b01 *= invdet;
                    b02 *= invdet;
                    b03 *= invdet;
                    b04 *= invdet;
                    b05 *= invdet;
                    b06 *= invdet;
                    b07 *= invdet;
                    b08 *= invdet;
                    b09 *= invdet;
                    b10 *= invdet;
                    b11 *= invdet;
                    return new Matrix3d(a11 * b11 - a12 * b10 + a13 * b09, a02 * b10 - a01 * b11 - a03 * b09, a31 * b05 - a32 * b04 + a33 * b03, a22 * b04 - a21 * b05 - a23 * b03, a12 * b08 - a10 * b11 - a13 * b07, a00 * b11 - a02 * b08 + a03 * b07, a32 * b02 - a30 * b05 - a33 * b01, a20 * b05 - a22 * b02 + a23 * b01, a10 * b10 - a11 * b08 + a13 * b06, a01 * b08 - a00 * b10 - a03 * b06, a30 * b04 - a31 * b02 + a33 * b00, a21 * b02 - a20 * b04 - a23 * b00, a11 * b07 - a10 * b09 - a12 * b06, a00 * b09 - a01 * b07 + a02 * b06, a31 * b01 - a30 * b03 - a32 * b00, a20 * b03 - a21 * b01 + a22 * b00);
                },
                transpose: function () {
                    var m = this;
                    return new Matrix3d(m.m11, m.m21, m.m31, m.m41, m.m12, m.m22, m.m32, m.m42, m.m13, m.m23, m.m33, m.m43, m.m14, m.m24, m.m34, m.m44);
                },
                interpolation: function (matrix) {
                    return new MatrixInterpolation(this, matrix);
                },
                toArray: function () {
                    return this.is2d() ? this.toArray2d() : this.toArray3d();
                },
                toArray3d: function () {
                    var m = this;
                    return [
                        m.m11,
                        m.m12,
                        m.m13,
                        m.m14,
                        m.m21,
                        m.m22,
                        m.m23,
                        m.m24,
                        m.m31,
                        m.m32,
                        m.m33,
                        m.m34,
                        m.m41,
                        m.m42,
                        m.m43,
                        m.m44
                    ];
                },
                toArray2d: function () {
                    var m = this;
                    return [
                        m.a,
                        m.b,
                        m.c,
                        m.d,
                        m.e,
                        m.f
                    ];
                },
                toString: function (places) {
                    return this.is2d() ? this.toString2d(places) : this.toString3d(places);
                },
                toString3d: function (places) {
                    return 'matrix3d(' + stringify(this.toArray3d()).join(', ') + ')';
                },
                toString2d: function (places) {
                    return 'matrix(' + stringify(this.toArray2d()).join(', ') + ')';
                }
            });
        var DecomposedMatrix = prime({
                constructor: function DecomposedMatrix(perspective, translate, quaternion, skew, scale) {
                    this.perspective = perspective;
                    this.translate = translate;
                    this.quaternion = quaternion;
                    this.skew = skew;
                    this.scale = scale;
                },
                interpolate: function (to, delta) {
                    var from = this;
                    var perspective = from.perspective.lerp(to.perspective, delta);
                    var translate = from.translate.lerp(to.translate, delta);
                    var quaternion = from.quaternion.slerp(to.quaternion, delta);
                    var skew = from.skew.lerp(to.skew, delta);
                    var scale = from.scale.lerp(to.scale, delta);
                    return new DecomposedMatrix(perspective, translate, quaternion, skew, scale);
                },
                compose: function () {
                    return new Matrix3d().perspective(this.perspective).translate(this.translate).rotate(this.quaternion).skew(this.skew).scale(this.scale);
                }
            });
        var MatrixInterpolation = prime({
                constructor: function MatrixInterpolation(from, to) {
                    this.matrix1 = from;
                    this.matrix2 = to;
                    this.from = from.decompose();
                    this.to = to.decompose();
                },
                step: function (delta) {
                    if (delta === 0)
                        return this.matrix1;
                    if (delta === 1)
                        return this.matrix2;
                    return this.from.interpolate(this.to, delta).compose();
                }
            });
        Matrix3d.Decomposed = DecomposedMatrix;
        Matrix3d.Interpolation = MatrixInterpolation;
        module.exports = Matrix3d;
    },
    'f': function (require, module, exports, global) {
        var hasOwn = require('a');
        var forIn = require('g');
        function forOwn(obj, fn, thisObj) {
            forIn(obj, function (val, key) {
                if (hasOwn(obj, key)) {
                    return fn.call(thisObj, obj[key], key, obj);
                }
            });
        }
        module.exports = forOwn;
    },
    'g': function (require, module, exports, global) {
        var hasOwn = require('a');
        var _hasDontEnumBug, _dontEnums;
        function checkDontEnum() {
            _dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ];
            _hasDontEnumBug = true;
            for (var key in { 'toString': null }) {
                _hasDontEnumBug = false;
            }
        }
        function forIn(obj, fn, thisObj) {
            var key, i = 0;
            if (_hasDontEnumBug == null)
                checkDontEnum();
            for (key in obj) {
                if (exec(fn, obj, key, thisObj) === false) {
                    break;
                }
            }
            if (_hasDontEnumBug) {
                var ctor = obj.constructor, isProto = !!ctor && obj === ctor.prototype;
                while (key = _dontEnums[i++]) {
                    if ((key !== 'constructor' || !isProto && hasOwn(obj, key)) && obj[key] !== Object.prototype[key]) {
                        if (exec(fn, obj, key, thisObj) === false) {
                            break;
                        }
                    }
                }
            }
        }
        function exec(fn, obj, key, thisObj) {
            return fn.call(thisObj, obj[key], key, obj);
        }
        module.exports = forIn;
    }
}, this));
