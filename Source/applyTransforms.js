var transform3d = require('transform3d'),
    transform = require('./transform')

module.exports = function applyTransforms(){
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
      'scaleZ'],
    transformation = new transform3d,
    i,
    max,
    property;

  for(i = 0, max = properties.length; i < max; i++){
    property = properties[i]
    if(this.hasAttribute(property))
      transformation[property](this.getAttribute(property) -0);
  }

  transform(this, transformation.compose());
}
