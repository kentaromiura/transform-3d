var
    Transform3dProto = Object.create(HTMLElement.prototype);
    var applyTransform = require('./applyTransforms');
    Transform3dProto.createdCallback = applyTransform;
    Transform3dProto.attributeChangedCallback = applyTransform;
    var div = document.createElement('div');
    div.innerHTML = '<style>transform-3d{display:block;}</style>';
    document.head.appendChild(div.firstChild);
    div = null;

    module.exports = document.registerElement('transform-3d', {
        prototype: Transform3dProto
    });
