var transform3d = require('transform3d'),
    transform = require('./transform'),
    operations = require('transform3d/lib/operations');

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
    transformation,
    i,
    max,
    property;

  if(!this._transform3d){
     this._transform3d = new transform3d;
     this._identity = this._transform3d.compose();
  }
  transformation = this._transform3d;
  transformation.operations = [new operations.Matrix(this._identity)]
  for(i = 0, max = properties.length; i < max; i++){
    property = properties[i]
    if(this.hasAttribute(property))
      transformation[property](this.getAttribute(property) -0);
  }

  transform(this, transformation.compose());
}
