/*
 * Lazy Load - jQuery plugin for lazy loading images
 *
 * Copyright (c) 2007-2012 Mika Tuupola
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   http://www.appelsiini.net/projects/lazyload
 *
 * Version:  1.8.0
 * 
 * @see https://github.com/tuupola/jquery_lazyload
 * 
 * Modified by dongyuwei@lightinthebox.com, since 2012-08-29
 * dongyuwei's Modification:
 * 1 adjust for jquery v1.3.1(data api has bug?)
 * 2 handle img `error` event
 * 3 `scroll` event optimization
 * 4 ipad support(`touchmove` event)
 * 5 unbind `scroll` event after all imgs loaded
 * 6 taobao's BigRender support(lazy render the html in `TEXTAREA` ) 
 * 7 select all lazy-rendered img and textarea by `data-lazy` Property , which is $("[data-lazy]") in jQuery;
 * 8 all lazy-rendered img and textarea should have `lazy-render` class
 *
 */
(function($, window) {
    var $window = $(window);

    $.fn.lazyload = function(options) {
        var elements = this;
        var $container;
        var settings = {
            threshold       : 0,
            failure_limit   : 0,
            event           : "scroll",
            effect          : "show",
            container       : window,
            data_attribute  : "src",
            skip_invisible  : false,
            appear          : null,
            load            : null,
            timer           : 30
        };

        function update() {
            var counter = 0;

            elements.each(function() {
                var $this = $(this);

                if (settings.skip_invisible && !$this.is(":visible")) {
                    return;
                }

                if ($.abovethetop(this, settings) ||
                    $.leftofbegin(this, settings)) {
                        /* Nothing. */
                } else if (!$.belowthefold(this, settings) &&
                    !$.rightoffold(this, settings)) {
                        $this.trigger("appear");
                } else {
                    if (++counter > settings.failure_limit) {
                        return false;
                    }
                }
            });

        }

        if(options) {
            /* Maintain BC for a couple of versions. */
            if (undefined !== options.failurelimit) {
                options.failure_limit = options.failurelimit; 
                delete options.failurelimit;
            }
            if (undefined !== options.effectspeed) {
                options.effect_speed = options.effectspeed; 
                delete options.effectspeed;
            }

            $.extend(settings, options);
        }

        /* Cache container as jQuery as object. */
        $container = (settings.container === undefined ||
                      settings.container === window) ? $window : $(settings.container);

        /* Fire one scroll event per scroll. Not one scroll event per image. */
        var scrollMonitor;
        if (0 === settings.event.indexOf("scroll")) {
            var timer;
            scrollMonitor = function(event) {
                if(timer){
                    clearTimeout(timer);
                }
                timer = setTimeout(function(){
                    update();
                },settings.timer);
            };
            $container.bind('scroll', scrollMonitor);
        }

        function renderTextareaContent(area) {
            area.removeAttribute('class');
            var content = document.createElement('div');
            extractScript(area.value,function(html,js){
                content.innerHTML = html;
                area.parentNode.insertBefore(content, area);
                area.parentNode.removeChild(area);
                execScript(js);
                update();
            });
        }

        function execScript(scripts){
            if (window.execScript){
                window.execScript(scripts);
            } else {
                window.eval(scripts);
            }
        }

        function extractScript(text,callback) {
            var scripts = [];
            text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, function(){
                scripts.push(arguments[1]);
                return '';
            });
            callback(text,scripts.join(';'));
        }

        function loaded(self,$self){
            self.loaded = true;
            $self.removeClass('lazy-render');

            $self[0].removeAttribute('data-' + settings.data_attribute);
            $self.unbind('load');

            /* Remove image from array so it is not looped next time. */
            var temp = $.grep(elements, function(element) {
                return !element.loaded;
            });
            elements = $(temp);

            if(elements.length === 0){
                $container.unbind('scroll', scrollMonitor);
            }

            if (settings.load) {
                var elements_left = elements.length;
                settings.load.call(self, elements_left, settings);
            }
        }

        this.each(function() {
            var self = this;
            var $self = $(self);
            var tag ;
            self.loaded = false;

            /* When appear is triggered load original image. */
            $self.one("appear", function() {
                if (!self.loaded) {
                    if (settings.appear) {
                        var elements_left = elements.length;
                        settings.appear.call(self, elements_left, settings);
                    }
                    tag = self.tagName.toUpperCase();

                    if(tag === 'TEXTAREA'){
                        renderTextareaContent(self);
                        loaded(self,$self);
                    }
                    if(tag === 'IMG'){
                        $self.is(":visible") && $self.css('opacity',0);
                        
                        var src = $self.attr('data-' + settings.data_attribute);
                        $self
                            .bind("load", function(){
                                $self.is(":visible") && $self.animate({
                                    'opacity': 1
                                }, 300);

                                loaded(self,$self);
                            })
                            .bind('error',function(){//reload img once again!
                                $self.attr("src", src);
                                $self.unbind('error');
                            })
                            .attr("src", src);
                    }
                }
            });
        });

        /* Check if something appears when window is resized. */
        $window.bind("resize", function(event) {
            update();
        });

        //ipad touchmove
        $window.bind("touchmove", function(event) {
            update();
        });

        /* Force initial check if images should appear. */
        $(document).ready(function() {
            update();
        });
        
        return this;
    };

    /* Convenience methods in jQuery namespace.           */
    /* Use as  $.belowthefold(element, {threshold : 100, container : window}) */

    $.belowthefold = function(element, settings) {
        var fold;
        
        if (settings.container === undefined || settings.container === window) {
            fold = $window.height() + $window.scrollTop();
        } else {
            fold = $(settings.container).offset().top + $(settings.container).height();
        }

        return fold <= $(element).offset().top - settings.threshold;
    };
    
    $.rightoffold = function(element, settings) {
        var fold;

        if (settings.container === undefined || settings.container === window) {
            fold = $window.width() + $window.scrollLeft();
        } else {
            fold = $(settings.container).offset().left + $(settings.container).width();
        }

        return fold <= $(element).offset().left - settings.threshold;
    };
        
    $.abovethetop = function(element, settings) {
        var fold;
        
        if (settings.container === undefined || settings.container === window) {
            fold = $window.scrollTop();
        } else {
            fold = $(settings.container).offset().top;
        }

        return fold >= $(element).offset().top + settings.threshold  + $(element).height();
    };
    
    $.leftofbegin = function(element, settings) {
        var fold;
        
        if (settings.container === undefined || settings.container === window) {
            fold = $window.scrollLeft();
        } else {
            fold = $(settings.container).offset().left;
        }

        return fold >= $(element).offset().left + settings.threshold + $(element).width();
    };

    $.inviewport = function(element, settings) {
         return !$.rightoffold(element, settings) && !$.leftofbegin(element, settings) &&
                !$.belowthefold(element, settings) && !$.abovethetop(element, settings);
     };

    /* Custom selectors for your convenience.   */
    /* Use as $("img:below-the-fold").something() or */
    /* $("img").filter(":below-the-fold").something() which is faster */

    $.extend($.expr[':'], {
        "below-the-fold" : function(a) { return $.belowthefold(a, {threshold : 0}); },
        "above-the-top"  : function(a) { return !$.belowthefold(a, {threshold : 0}); },
        "right-of-screen": function(a) { return $.rightoffold(a, {threshold : 0}); },
        "left-of-screen" : function(a) { return !$.rightoffold(a, {threshold : 0}); },
        "in-viewport"    : function(a) { return $.inviewport(a, {threshold : 0}); },
        /* Maintain BC for couple of versions. */
        "above-the-fold" : function(a) { return !$.belowthefold(a, {threshold : 0}); },
        "right-of-fold"  : function(a) { return $.rightoffold(a, {threshold : 0}); },
        "left-of-fold"   : function(a) { return !$.rightoffold(a, {threshold : 0}); }
    });

    $(document).ready(function(){
        $("[data-lazy]").lazyload();
    }); 
})(jQuery, window);