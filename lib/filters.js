(function() {
    Filters = {};
    Filters.getPixels = function(img) {
        var c = this.getCanvas(img.width, img.height);
        var ctx = c.getContext('2d');
        ctx.drawImage(img,0,0);
        return ctx.getImageData(0,0,c.width, c.height);
    };
    Filters.getAsImage = function(pixels) {
        var c = this.getCanvas(pixels.width, pixels.height);
        var ctx = c.getContext('2d');
        ctx.putImageData(pixels, 0,0);
        var data = c.toDataURL("image/png");
        var img = new Image();
        img.src = data;
        return img;
    }
    Filters.getCanvas = function(w,h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    };
    Filters.filterImage = function(filter, image, var_args) {
        var args = [this.getPixels(image)];
        for(var i=2; i<arguments.length; i++) {
            args.push(arguments[i]);
        }
        return this.getAsImage(filter.apply(null,args));
    }
    Filters.grayscale = function(pixels, args) {
        var d = pixels.data;
        for(var i=0; i<d.length; i+=4) {
            var r = d[i];
            var g = d[i+1];
            var b = d[i+2];
            //CIE luminance
            var v = 0.2126*r + 0.7152*g + 0.0722*b;
            d[i] = d[i+1] = d[i+2] = v;
        }
        return pixels;
    }
    Filters.brightness = function(pixels, adjustment) {
        var d = pixels.data;
        for(var i=0; i<d.length; i+=4) {
            d[i]   += adjustment;
            d[i+i] += adjustment;
            d[i+2] += adjustment;
        }
        return pixels;
    };
    Filters.threshold = function(pixels, threshold) {
        var d = pixels.data;
        for(var i=0; i<d.length; i+=4) {
            var r = d[i];
            var g = d[i+1];
            var b = d[i+2];
            //CIE luminance
            var v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255: 0;
            d[i] = d[i+1] = d[i+2] = v;
        }
        return pixels;
    }
    Filters.tempCanvas = document.createElement('canvas');
    Filters.tempCtx = Filters.tempCanvas.getContext('2d');
    Filters.createImageData = function(w,h) {
        return this.tempCtx.createImageData(w,h);
    };
    Filters.convolute = function(pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side/2);
        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;
        
        //pad output by the convolution matrix
        var w = sw;
        var h = sh;
        var output = Filters.createImageData(w,h);
        var dst = output.data;
        
        //go through the destination image pixels
        var alphaFac = opaque ? 1: 0;
        for(var y=0; y<h; y++) {
            for(var x=0; x<w; x++) {
                var sy = y;
                var sx = x;
                var dstOffset = (y*w+x)*4;
                //calculate the weighted sum of the soruce image pixels that
                //fall under the convolution matrix;
                var r=0, g=0, b=0, a=0;
                for(var cy=0; cy<side; cy++) {
                    for(var cx=0; cx<side; cx++) {
                        var scy = sy + cy - halfSide;
                        var scx = sx + cx - halfSide;
                        if(scy >=0 && scy < sh && scx >=0 && scx < sw) {
                            var srcOffset = (scy*sw+scx)*4;
                            var wt = weights[cy*side+cx];
                            r += src[srcOffset  ] * wt;
                            g += src[srcOffset+1] * wt;
                            b += src[srcOffset+2] * wt;
                            a += src[srcOffset+3] * wt;
                        }
                    }
                }
                
                dst[dstOffset]   = r;
                dst[dstOffset+1] = g;
                dst[dstOffset+2] = b;
                dst[dstOffset+3] = a + alphaFac*(255-a);
                
            }
        }
        
        return output;
        
    };
    Filters.gamma = function(pixels, gamma) {
        var d = pixels.data;
        for(var i=0; i<d.length; i+=4) {
            var r = d[i];
            var g = d[i+1];
            var b = d[i+2];
            r = 255 * (Math.pow(r/255, gamma))
            g = 255 * (Math.pow(g/255, gamma))
            b = 255 * (Math.pow(b/255, gamma))
            d[i] = r;
            d[i+1] = g;
            d[i+2] = b;
        }
        return pixels;
    };
    Filters.histogram = function(pixels, weights) {
        //weights = [red shadow, red gamma, red light, blue shadow....]
        var d = pixels.data;
        for(var i=0; i<d.length; i+=4) {
            var r = d[i];
            var g = d[i+1];
            var b = d[i+2];
            //shadow clip
            r = (r-weights[0]) * (255 / (255-weights[0]));
            g = (g-weights[3]) * (255 / (255-weights[3]));
            b = (b-weights[6]) * (255 / (255-weights[6]));
            //light clip
            r = (r+weights[2]) * (255 / (255+weights[2]));
            g = (g+weights[5]) * (255 / (255+weights[5]));
            b = (b+weights[8]) * (255 / (255+weights[8]));
            //gamma
            r = 255 * (Math.pow(r/255,weights[1]));
            g = 255 * (Math.pow(g/255,weights[4]));
            b = 255 * (Math.pow(b/255,weights[7]));
            //result
            d[i] = r;
            d[i+1] = g;
            d[i+2] = b;
            
        }
        return pixels;
    };
})();