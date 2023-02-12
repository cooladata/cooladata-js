/*
 * Licensed to CRATE Technology GmbH ("Crate") under one or more contributor
 * license agreements.  See the NOTICE file distributed with this work for
 * additional information regarding copyright ownership.  Crate licenses
 * this file to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.  You may
 * obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * However, if you have executed another commercial license agreement
 * with Crate these terms will supersede the license and you may use the
 * software solely pursuant to the terms of the relevant commercial agreement.
 */
(function (cooladata) {

    /*
     * Saved references to long variable names, so that closure compiler can
     * minimize file size.
     */
    var ArrayProto = Array.prototype
        , FuncProto = Function.prototype
        , ObjProto = Object.prototype
        , slice = ArrayProto.slice
        , toString = ObjProto.toString
        , hasOwnProperty = ObjProto.hasOwnProperty
        , windowConsole = window.console
        , navigator = window.navigator
        , document = window.document
        , userAgent         = navigator.userAgent
        , clientHintsPromise;

    if (navigator.userAgentData && navigator.userAgentData.platform) {
        clientHintsPromise = navigator.userAgentData.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion', 'uaFullVersion', 'fullVersionList', 'wow64'])
            .then(JSON.stringify);
    }

    /** @const */   var PRIMARY_INSTANCE_NAME = "cooladata";

    /*
     * Dynamic... constants? Is that an oxymoron?
     */
    var LIB_VERSION = '2.2.24',
        SNIPPET_VERSION = (cooladata && cooladata['__SV']) || 0,

        // http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
        // https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#withCredentials
        USE_XHR = (window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()),

        // IE<10 does not support cross-origin XHR's but script tags
        // with defer won't block window.onload; ENQUEUE_REQUESTS
        // should only be true for Opera<12
        ENQUEUE_REQUESTS = !USE_XHR && (userAgent.indexOf('MSIE') == -1) && (userAgent.indexOf('Mozilla') == -1);

    /*
     * Closure-level globals
     */
    var _ = {}
        , DEFAULT_CONFIG = {
            "api_host": "api.cooladata.com"
            , "loaded": function () { }
            , "img": false
            , "http_post": false
            , "track_pageload": false
            , "stored_user_key_name": "medallia_journeys_id"
            , "user_identifier_property": "user_id"
        }
        , DOM_LOADED = false;

    // UNDERSCORE
    // Embed part of the Underscore Library

    (function () {
        var nativeBind = FuncProto.bind,
            nativeForEach = ArrayProto.forEach,
            nativeIndexOf = ArrayProto.indexOf,
            nativeIsArray = Array.isArray,
            breaker = {};

        /**
         * @param {*=} obj
         * @param {function(...[*])=} iterator
         * @param {Object=} context
         */
        var each = _.each = function (obj, iterator, context) {
            if (obj == null) return;
            if (nativeForEach && obj.forEach === nativeForEach) {
                obj.forEach(iterator, context);
            } else if (obj.length === +obj.length) {
                for (var i = 0, l = obj.length; i < l; i++) {
                    if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
                }
            } else {
                for (var key in obj) {
                    if (hasOwnProperty.call(obj, key)) {
                        if (iterator.call(context, obj[key], key, obj) === breaker) return;
                    }
                }
            }
        };

        _.extend = function (obj) {
            each(slice.call(arguments, 1), function (source) {
                for (var prop in source) {
                    if (source[prop] !== void 0) obj[prop] = source[prop];
                }
            });
            return obj;
        };

        _.isArray = nativeIsArray || function (obj) {
            return toString.call(obj) === '[object Array]';
        };

        // from a comment on http://dbj.org/dbj/?p=286
        // fails on only one very rare and deliberate custom object:
        // var bomb = { toString : undefined, valueOf: function(o) { return "function BOMBA!"; }};
        _.isFunction = function (f) {
            try {
                return /^\s*\bfunction\b/.test(f);
            } catch (x) {
                return false;
            }
        };

        _.isArguments = function (obj) {
            return !!(obj && hasOwnProperty.call(obj, 'callee'));
        };

        _.toArray = function (iterable) {
            if (!iterable) return [];
            if (iterable.toArray) return iterable.toArray();
            if (_.isArray(iterable)) return slice.call(iterable);
            if (_.isArguments(iterable)) return slice.call(iterable);
            return _.values(iterable);
        };

        _.values = function (obj) {
            var results = [];
            if (obj == null) return results;
            each(obj, function (value) {
                results[results.length] = value;
            });
            return results;
        };

    })();

    // Underscore Addons
    _.isObject = function (obj) {
        return (obj === Object(obj) && !_.isArray(obj));
    };

    _.isUndefined = function (obj) {
        return obj === void 0;
    };

    _.isString = function (obj) {
        return toString.call(obj) == '[object String]';
    };

    _.JSONEncode = (function () {
        return function (mixed_val) {
            var indent;
            var value = mixed_val;
            var i;

            var quote = function (string) {
                var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
                var meta = {    // table of character substitutions
                    '\b': '\\b',
                    '\t': '\\t',
                    '\n': '\\n',
                    '\f': '\\f',
                    '\r': '\\r',
                    '"': '\\"',
                    '\\': '\\\\'
                };

                escapable.lastIndex = 0;
                return escapable.test(string) ?
                    '"' + string.replace(escapable, function (a) {
                        var c = meta[a];
                        return typeof c === 'string' ? c :
                            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    }) + '"' :
                    '"' + string + '"';
            };

            var str = function (key, holder) {
                var gap = '';
                var indent = '    ';
                var i = 0;          // The loop counter.
                var k = '';          // The member key.
                var v = '';          // The member value.
                var length = 0;
                var mind = gap;
                var partial = [];
                var value = holder[key];

                // If the value has a toJSON method, call it to obtain a replacement value.
                if (value && typeof value === 'object' &&
                    typeof value.toJSON === 'function') {
                    value = value.toJSON(key);
                }

                // What happens next depends on the value's type.
                switch (typeof value) {
                    case 'string':
                        return quote(value);

                    case 'number':
                        // JSON numbers must be finite. Encode non-finite numbers as null.
                        return isFinite(value) ? String(value) : 'null';

                    case 'boolean':
                    case 'null':
                        // If the value is a boolean or null, convert it to a string. Note:
                        // typeof null does not produce 'null'. The case is included here in
                        // the remote chance that this gets fixed someday.

                        return String(value);

                    case 'object':
                        // If the type is 'object', we might be dealing with an object or an array or
                        // null.
                        // Due to a specification blunder in ECMAScript, typeof null is 'object',
                        // so watch out for that case.
                        if (!value) {
                            return 'null';
                        }

                        // Make an array to hold the partial results of stringifying this object value.
                        gap += indent;
                        partial = [];

                        // Is the value an array?
                        if (toString.apply(value) === '[object Array]') {
                            // The value is an array. Stringify every element. Use null as a placeholder
                            // for non-JSON values.

                            length = value.length;
                            for (i = 0; i < length; i += 1) {
                                partial[i] = str(i, value) || 'null';
                            }

                            // Join all of the elements together, separated with commas, and wrap them in
                            // brackets.
                            v = partial.length === 0 ? '[]' :
                                gap ? '[\n' + gap +
                                    partial.join(',\n' + gap) + '\n' +
                                    mind + ']' :
                                    '[' + partial.join(',') + ']';
                            gap = mind;
                            return v;
                        }

                        // Iterate through all of the keys in the object.
                        for (k in value) {
                            if (hasOwnProperty.call(value, k)) {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }

                        // Join all of the member texts together, separated with commas,
                        // and wrap them in braces.
                        v = partial.length === 0 ? '{}' :
                            gap ? '{' + partial.join(',') + '' +
                                mind + '}' : '{' + partial.join(',') + '}';
                        gap = mind;
                        return v;
                }
            };

            // Make a fake root object containing our value under the key of ''.
            // Return the result of stringifying the value.
            return str('', {
                '': value
            });
        };
    })();

    _.strip_empty_properties = function (p) {
        var ret = {};
        _.each(p, function (v, k) {
            if (_.isString(v) && v.length > 0) { ret[k] = v; }
        });
        return ret;
    };

    _.base64Encode = function (data) {

        var Base64 = {
            _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
            , encode: function (e) { var t = ""; var n, r, i, s, o, u, a; var f = 0; e = Base64._utf8_encode(e); while (f < e.length) { n = e.charCodeAt(f++); r = e.charCodeAt(f++); i = e.charCodeAt(f++); s = n >> 2; o = (n & 3) << 4 | r >> 4; u = (r & 15) << 2 | i >> 6; a = i & 63; if (isNaN(r)) { u = a = 64 } else if (isNaN(i)) { a = 64 } t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a) } return t }
            , _utf8_encode: function (e) { e = e.replace(/\r\n/g, "\n"); var t = ""; for (var n = 0; n < e.length; n++) { var r = e.charCodeAt(n); if (r < 128) { t += String.fromCharCode(r) } else if (r > 127 && r < 2048) { t += String.fromCharCode(r >> 6 | 192); t += String.fromCharCode(r & 63 | 128) } else { t += String.fromCharCode(r >> 12 | 224); t += String.fromCharCode(r >> 6 & 63 | 128); t += String.fromCharCode(r & 63 | 128) } } return t }
        }

        return Base64.encode(data);
    };

    _.utf8Encode = function (e) {
        e = e.replace(/\r\n/g, "\n"); var t = ""; for (var n = 0; n < e.length; n++) { var r = e.charCodeAt(n); if (r < 128) { t += String.fromCharCode(r) } else if (r > 127 && r < 2048) { t += String.fromCharCode(r >> 6 | 192); t += String.fromCharCode(r & 63 | 128) } else { t += String.fromCharCode(r >> 12 | 224); t += String.fromCharCode(r >> 6 & 63 | 128); t += String.fromCharCode(r & 63 | 128) } } return t
    };

    /**
     * @param {Object=} formdata
     * @param {string=} arg_separator
     */
    _.HTTPBuildQuery = function (formdata, arg_separator) {
        var key, use_val, use_key, tmp_arr = [];

        if (typeof (arg_separator) === "undefined") {
            arg_separator = '&';
        }

        _.each(formdata, function (val, key) {
            use_val = encodeURIComponent(val.toString());
            use_key = encodeURIComponent(key);
            tmp_arr[tmp_arr.length] = use_key + '=' + use_val;
        });

        return tmp_arr.join(arg_separator);
    };

    _.UUID = (function () {

        // Time/ticks information
        // 1*new Date() is a cross browser version of Date.now()
        var T = function () {
            var d = 1 * new Date()
                , i = 0;

            // this while loop figures how many browser ticks go by
            // before 1*new Date() returns a new number, ie the amount
            // of ticks that go by per millisecond
            while (d == 1 * new Date()) { i++; }

            return d.toString(16) + i.toString(16);
        };

        // Math.Random entropy
        var R = function () {
            return Math.random().toString(16).replace('.', '');
        };

        // User agent entropy
        // This function takes the user agent string, and then xors
        // together each sequence of 8 bytes.  This produces a final
        // sequence of 8 bytes which it returns as hex.
        var UA = function (n) {
            var ua = userAgent, i, ch, buffer = [], ret = 0;

            function xor(result, byte_array) {
                var j, tmp = 0;
                for (j = 0; j < byte_array.length; j++) {
                    tmp |= (buffer[j] << j * 8);
                }
                return result ^ tmp;
            }

            for (i = 0; i < ua.length; i++) {
                ch = ua.charCodeAt(i);
                buffer.unshift(ch & 0xFF);
                if (buffer.length >= 4) {
                    ret = xor(ret, buffer);
                    buffer = [];
                }
            }

            if (buffer.length > 0) { ret = xor(ret, buffer); }

            return ret.toString(16);
        };

        return function () {
            var se = (screen.height * screen.width).toString(16);
            return (T() + "-" + R() + "-" + UA() + "-" + se + "-" + T());
        };
    })();

    _.getQueryParam = function (url, param) {
        // Expects a raw URL

        param = param.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + param + "=([^&#]*)",
            regex = new RegExp(regexS),
            results = regex.exec(url);
        if (results === null || (results && typeof (results[1]) !== 'string' && results[1].length)) {
            return '';
        } else {
            return decodeURIComponent(results[1]).replace(/\+/g, ' ');
        }
    };

    _.register_event = (function () {
        // written by Dean Edwards, 2005
        // with input from Tino Zijdel - crisp@xs4all.nl
        // with input from Carl Sverre - mail@carlsverre.com
        // with input from Cooladata
        // http://dean.edwards.name/weblog/2005/10/add-event/
        // https://gist.github.com/1930440

        /**
         * @param {Object} element
         * @param {string} type
         * @param {function(...[*])} handler
         * @param {boolean=} oldSchool
         */
        var register_event = function (element, type, handler, oldSchool) {
            if (!element) {
                windowConsole.log("No valid element provided to register_event");
                return;
            }

            if (element.addEventListener && !oldSchool) {
                element.addEventListener(type, handler, false);
            } else {
                var ontype = 'on' + type;
                var old_handler = element[ontype]; // can be undefined
                element[ontype] = makeHandler(element, handler, old_handler);
            }
        };

        function makeHandler(element, new_handler, old_handlers) {
            var handler = function (event) {
                event = event || fixEvent(window.event);

                // this basically happens in firefox whenever another script
                // overwrites the onload callback and doesn't pass the event
                // object to previously defined callbacks.  All the browsers
                // that don't define window.event implement addEventListener
                // so the dom_loaded handler will still be fired as usual.
                if (!event) { return undefined; }

                var ret = true;
                var old_result, new_result;

                if (_.isFunction(old_handlers)) {
                    old_result = old_handlers(event);
                }
                new_result = new_handler.call(element, event);

                if ((false === old_result) || (false === new_result)) {
                    ret = false;
                }

                return ret;
            };

            return handler;
        };

        function fixEvent(event) {
            if (event) {
                event.preventDefault = fixEvent.preventDefault;
                event.stopPropagation = fixEvent.stopPropagation;
            }
            return event;
        };
        fixEvent.preventDefault = function () {
            this.returnValue = false;
        };
        fixEvent.stopPropagation = function () {
            this.cancelBubble = true;
        };

        return register_event;
    })();

    _.info = {
        campaignParams: function () {
            var campaign_keywords = 'utm_source utm_medium utm_campaign utm_content utm_term'.split(' ')
                , kw = ''
                , params = {};
            _.each(campaign_keywords, function (kwkey) {
                kw = _.getQueryParam(document.URL, kwkey);
                if (kw.length) {
                    params[kwkey] = kw;
                }
            });

            return params;
        },

        referringDomain: function (referrer) {
            var split = referrer.split("/");
            if (split.length >= 3) {
                return split[2];
            }
            return "";
        },

        properties: function () {
            return _.extend(_.strip_empty_properties({
                'session_screen_size': window.screen.width + 'x' + window.screen.height,
                'session_dua': navigator.userAgent,
                'session_platform': navigator.platform,
                'referring_url': document.referrer,
                'referring_domain': _.info.referringDomain(document.referrer),
                'page_title': document.title,
                'page_url': document.location.href
            }), {
                'tracker_type': 'javascript',
                'tracker_version': LIB_VERSION
            });
        },

        pageviewInfo: function (page) {
            return _.strip_empty_properties({
                'event_timestamp_epoch': 1 * (new Date()),
            });
        }
    };

    // Console override
    var console = {
        /** @type {function(...[*])} */
        critical: function () {
            if (!_.isUndefined(windowConsole) && windowConsole) {
                var args = ["Cooladata error:"].concat(_.toArray(arguments));
                try {
                    windowConsole.error.apply(windowConsole, args);
                } catch (err) {
                    _.each(args, function (arg) {
                        windowConsole.error(arg);
                    });
                }
            }
        }
    };

    /**
     * create_cooladatalib(token:string, config:object, name:string)
     *
     * This function is used by the init method of CooladataLib objects
     * as well as the main initializer at the end of the JSLib (that
     * initializes document.cooladata as well as any additional instances
     * declared before this file has loaded).
     */
    var create_cooladatalib = function (token, config, name) {
        var instance, target = (name === PRIMARY_INSTANCE_NAME) ? cooladata : cooladata[name];

        if (target && !_.isArray(target)) {
            windowConsole.log("You have already initialized " + name);
            return;
        }

        instance = new CooladataLib();
        instance._init(token, config, name);

        // if target is not defined, we called init after the lib already
        // loaded, so there won't be an array of things to execute
        if (!_.isUndefined(target)) {

            instance._execute_array(target);
        }

        return instance;
    };

    /**
     * Cooladata Library Object
     * @constructor
     */
    var CooladataLib = function () { };

    // Initialization methods

    /**
     * This function initialize a new instance of the Cooladata tracking object.
     * All new instances are added to the main cooladata object as sub properties (such as
     * cooladata.your_library_name) and also returned by this function.  If you wanted
     * to define a second instance on the page you would do it like so:
     *
     *      cooladata.init("new token", { your: "config" }, "library_name")
     *
     * and use it like this:
     *
     *      cooladata.library_name.track(...)
     *
     * @param {String} token   Your Cooladata API token
     * @param {Object} [config]  A dictionary of config options to override
     * @param {String} [name]    The name for the new cooladata instance that you want created
     */
    CooladataLib.prototype.init = function (token, config, name) {
        if (typeof (name) === "undefined") {
            windowConsole.log("You must name your new library: init(token, config, name)");
            return;
        }
        if (name === PRIMARY_INSTANCE_NAME) {
            windowConsole.log("You must initialize the main cooladata object right after you include the Cooladata js snippet");
            return;
        }

        var instance = create_cooladatalib(token, config, name);
        cooladata[name] = instance;
        instance._loaded();

        return instance;
    };

    // cooladata._init(userObject:object, config:object, name:string)
    //
    // This function sets up the current instance of the cooladata
    // library.  The difference between this method and the init(...)
    // method is this one initializes the actual instance, whereas the
    // init(...) method sets up a new library and calls _init on it.
    //
    CooladataLib.prototype._init = function (userObject, c, name) {
        this['__loaded'] = true;
        this['__SV'] = true;
        this['config'] = {};
        this['eventsArray'] = [];

        this.set_config(_.extend({}, DEFAULT_CONFIG, {
            "token": userObject.app_key
            , "img": userObject.img_src_get_request
            , "session_id": userObject.session_id
            , "http_post": userObject.http_post
            , "track_pageload": userObject.track_pageload
            , "user_identifier_property": userObject.user_identifier_property
            , "stored_user_key_name": userObject.stored_user_key_name
            , "name": name
        }));

        var api_host = userObject.api_host || DEFAULT_CONFIG.api_host;
        this.set_config({
            "api_host": "https://" + api_host
        });

        var userId = userObject.user_id || this.getStoredUid() || _.UUID();
        this.storeUid(userId);

        this.set_config({
            "user_id": userId
        });

        this.__dom_loaded_queue = [];
        this.__request_queue = [];

        if (userObject.custom_event_handler) {
            this.__customEventHandler = userObject.custom_event_handler;
        }
    };

    CooladataLib.prototype.getStoredUid = function () {
        var cname = this.get_config('stored_user_key_name');
        if (typeof (Storage) !== "undefined" && window.localStorage.getItem(cname)) {
            return window.localStorage.getItem(cname);
        }
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    };

    CooladataLib.prototype.storeUid = function (userId) {
        var cname = this.get_config('stored_user_key_name');
        if (typeof (Storage) !== "undefined") {
            window.localStorage.setItem(cname, userId);
            return;
        }

        var date = new Date();
        date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));

        var expires = "; expires=" + date.toGMTString();
        var path = "path=/";
        var sameSiteSecure = "; SameSite=Lax; Secure"

        var TLD = ["com", "org", "net", "int", "edu", "gov", "mil", "biz"];

        var full_domain = window.location.host;
        var parts = full_domain.split('.');
        var domain = "";


        if (parts[0] == "www" || parts.length == 4) {
            parts.shift();
            domain = parts.join(".");
        }
        else {
            switch (parts.length) {
                case 2:
                    domain = parts.join(".");
                    break;
                case 3:
                    var x = TLD.length;
                    while (x--) {
                        if (TLD[x] === parts[2]) {
                            parts.shift();
                            domain = parts.join(".");
                            break;
                        }
                    }
                    if (domain == "")
                        domain = parts.join(".");
                    break;
            }
        }

        document.cookie = cname + "=" + userId + expires + ';domain=.' + domain + ';' + path + sameSiteSecure;
    };

    CooladataLib.prototype._loaded = function () {
        this.get_config('loaded')(this);
        if (this.get_config('track_pageload')) {
            this.track_pageload();
        }
    };

    CooladataLib.prototype._dom_loaded = function () {
        _.each(this.__dom_loaded_queue, function (item) {
            this._track_dom.apply(this, item);
        }, this);
        _.each(this.__request_queue, function (item) {
            this._send_request.apply(this, item);
        }, this);
        delete this.__dom_loaded_queue;
        delete this.__request_queue;
    };

    CooladataLib.prototype._track_dom = function (DomClass, args) {
        if (this.get_config('img')) {
            windowConsole.log("You can't use DOM tracking functions with img = true.");
            return false;
        }

        if (!DOM_LOADED) {
            this.__dom_loaded_queue.push([DomClass, args]);
            return false;
        }

        var dt = new DomClass().init(this);
        return dt.track.apply(dt, args);
    };

    CooladataLib.prototype.trackEventLater = function (event_name, properties) {
        if (typeof (event_name) === "undefined") {
            windowConsole.log("No event name provided to cooladata.trackEventLater");
            return;
        }

        properties = properties || {};

        var now = new Date();
        var data = _.extend(
            {}
            , _.info.properties()
            , _.info.campaignParams()
            , {
                'event_name': event_name,
                'event_timestamp_epoch': now.getTime().toString(),
                'event_timezone_offset': -1.0 * (now.getTimezoneOffset() / 60),
                'session_id': this.get_config('session_id')
            }
        );

        data[this.get_config('user_identifier_property')] = this.get_config('user_id');

        data = _.extend(data, properties);

        if(clientHintsPromise){
            var self = this;
            clientHintsPromise.then(function (clientHintsValues) {
                data = _.extend(data, {client_hints: clientHintsValues});
            }).finally(function () {
                self.eventsArray.push(data);
            });
        } else {
            this.eventsArray.push(data);
        }
    };

    CooladataLib.prototype.flush = function () {
        var data = {
            events: this.eventsArray
        };

        var json_data = _.JSONEncode(data);
        this._send_request(json_data);
        this.eventsArray = [];
    };

    CooladataLib.prototype._onError = function (data, callback) {
        //windowConsole.log('onError');
    }

    CooladataLib.prototype._send_request = function (data, callback) {
        if (ENQUEUE_REQUESTS) {
            this.__request_queue.push(arguments);
            return;
        }

        var isOldIE = function () {
            var ua = window.navigator.userAgent;
            if (ua.indexOf("MSIE ") > -1) {
                var IEVersion = ua.split("MSIE ")[1].charAt(0);
                if (IEVersion !== 1) {
                    return true;
                }
                else {
                    return false;
                }
            }
            return false;
        }

        // check data size. Bigger than 2k, use post
        var doPost = false;
        var dataSize = data.length;
        if (dataSize > 1400) {
            doPost = true;
        }

        if (this.__customEventHandler && this.__customEventHandler.handleRequest) {
            var endpointType = null;
            if (!doPost && (isOldIE() || this.get_config('img'))) {
                endpointType = 'image';
            } else if (USE_XHR) {
                endpointType = (this.get_config('http_post') || doPost) ? 'post' : 'get';
            }
            this.__customEventHandler.handleRequest(this, data, endpointType);
            return;
        }

        var url = this.get_config('api_host') + "/v1/" + this.get_config('token') + "/track";

        if (!doPost && (isOldIE() || this.get_config('img'))) {
            var that = this;
            url = this.get_config('api_host') + "/egw/5/" + this.get_config('token') + "/track/__cool.gif";
            data = _.base64Encode(data);
            url += '?data=' + data;
            var img = document.createElement("img");
            img.onerror = function () {
                that._onError(data, callback);
            }
            img.width = 1;
            img.height = 1;
            img.src = url;
        } else if (USE_XHR) {
            var params = null;
            if (this.get_config('http_post') || doPost) {
                params = 'data=' + encodeURIComponent(data);
            }
            else {
                data = { 'data': _.base64Encode(data) };
                url += '?' + _.HTTPBuildQuery(data);
            }

            var req = new XMLHttpRequest();
            if (this.get_config('http_post') || doPost) {
                req.open("POST", url, true);
                req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            }
            else {
                req.open("GET", url, true);
            }
            // withCredentials cannot be modified until after calling .open on Android and Mobile Safari
            req.withCredentials = true;
            req.onreadystatechange = function (e) {
                if (req.readyState === 4) { // XMLHttpRequest.DONE == 4, except in safari 4
                    if (req.status === 200) {
                        if (callback) {
                            callback();
                        }
                    }
                    else {
                        var error = 'Bad HTTP status: ' + req.status + ' ' + req.statusText;
                        windowConsole.log(error);
                    }
                }
            };
            req.send(params);

        } else {
            data = {'data': _.base64Encode(data)};
            url += '?' + _.HTTPBuildQuery(data);
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.async = true;
            script.defer = true;
            script.src = url;
        }
    };

    /**
     * _execute_array() deals with processing any cooladata function
     * calls that were called before the Cooladata library were loaded
     * (and are thus stored in an array so they can be called later)
     *
     * Note: we fire off all the cooladata function calls && user defined
     * functions BEFORE we fire off cooladata tracking calls.  This is so
     * identify/register/set_config calls can properly modify early
     * tracking calls.
     *
     * @param {Array} array
     */
    CooladataLib.prototype._execute_array = function (array) {
        var fn_name, alias_calls = [], other_calls = [], tracking_calls = [];
        _.each(array, function (item) {
            if (item) {
                fn_name = item[0];
                if (typeof (item) === "function") {
                    item.call(this);
                } else if (_.isArray(item) && fn_name === 'alias') {
                    alias_calls.push(item);
                } else if (_.isArray(item) && (fn_name.indexOf('track') != -1 || fn_name.indexOf('flush') != -1) && typeof (this[fn_name]) === "function") {
                    tracking_calls.push(item);
                } else {
                    other_calls.push(item);
                }
            }
        }, this);

        var execute = function (calls, context) {
            _.each(calls, function (item) {
                this[item[0]].apply(this, item.slice(1));
            }, context);
        };

        execute(alias_calls, this);
        execute(other_calls, this);
        execute(tracking_calls, this);
    };

    /**
     * push() keeps the standard async-array-push
     * behavior around after the lib is loaded.
     * This is only useful for external integrations that
     * do not wish to rely on our convenience methods
     * (created in the snippet). Good example is Optimizely.
     *
     * ### Usage:
     *     cooladata.push(['register', { a: 'b' }]);
     *
     * @param {Array} item A [function_name, args...] array to be executed
     */
    CooladataLib.prototype.push = function (item) {
        this._execute_array([item]);
    };

    /**
     * Track an event.  This is the most important Cooladata function and
     * the one you will be using the most.
     *
     * ### Usage:
     *
     *     // track an event named "Registered"
     *     cooladata.track("Registered", {"Gender": "Male", "Age": 21});
     *
     *
     * @param {String} event_name The name of the event. This can be anything the user does - "Button Click", "Sign Up", "Item Purchased", etc.
     * @param {Object} [properties] A set of properties to include with the event you're sending. These describe the user who did the event or details about the event itself.
     */
    CooladataLib.prototype.trackEvent = function (event_name, properties, callback) {
        if (typeof (event_name) === "undefined") {
            windowConsole.log("No event name provided to cooladata.trackEvent");
            return;
        }

        // set defaults
        properties = properties || {};

        // note: extend writes to the first object, so lets make sure we
        // don't write to the cookie properties object and info
        // properties object by passing in a new object

        var now = new Date();

        // update properties with pageview info and super-properties
        var data = _.extend(
            {}
            , _.info.properties()
            , _.info.campaignParams()
            , {
                'event_name': event_name,
                'event_timestamp_epoch': now.getTime().toString(),
                'event_timezone_offset': -1.0 * (now.getTimezoneOffset() / 60),
                'session_id': this.get_config('session_id')
            }
        );

        var userIdProperty = this.get_config('user_identifier_property');
        data[userIdProperty] = this.get_config('user_id');

        data = _.extend(data, properties);
        
        if(clientHintsPromise){
            clientHintsPromise.then(function (clientHintsValues) {
                data = _.extend(data, {client_hints: clientHintsValues});
            }).finally(this._send_events.bind(this, data));
        } else {
            this._send_events(data);
        }
    };

    CooladataLib.prototype._send_events = function (events, callback) {
        var json_data = _.JSONEncode({
            events: [events]
        });

        this._send_request(
            json_data,
            callback
        );
    }

    /**
     * Track a page view event, which is currently ignored by the server.
     * This function is called by default on page load unless the
     * track_pageload configuration variable is false.
     *
     * @param {String} [page] The url of the page to record. If you don't include this, it defaults to the current url.
     */
    CooladataLib.prototype.track_pageload = function (page) {
        if (typeof (page) === "undefined") { page = document.location.href; }
        this.trackEvent("page_load", _.info.pageviewInfo(page));
    };

    /**
     * Update the configuration of a cooladata library instance.
     *
     * The default config is:
     *
     *     {
     *       // should we track a page view on page load
     *       track_pageload:             true
     *     }
     *
     *
     * @param {Object} config A dictionary of new configuration values to update
     */
    CooladataLib.prototype.set_config = function (config) {
        if (_.isObject(config)) {
            _.extend(this['config'], config);
        }
    };

    /**
     * returns the current config object for the library.
     */
    CooladataLib.prototype.get_config = function (prop_name) {
        return this['config'][prop_name];
    };

    /**
     * Returns the value of the super property named property_name. If no such
     * property is set, get_property will return the undefined value.
     *
     * @param {String} property_name The name of the super property you want to retrieve
     */
    // CooladataLib.prototype.get_property = function(property_name) {
    //     return this['cookie']['props'][property_name];
    // };

    CooladataLib.prototype.toString = function () {
        var name = this.get_config("name");
        if (name !== PRIMARY_INSTANCE_NAME) {
            name = PRIMARY_INSTANCE_NAME + "." + name;
        }
        return name;
    };

    // EXPORTS (for closure compiler)

    // Underscore Exports
    _['toArray'] = _.toArray;
    _['isObject'] = _.isObject;
    _['JSONEncode'] = _.JSONEncode;
    _['info'] = _.info;

    // CooladataLib Exports
    CooladataLib.prototype['init'] = CooladataLib.prototype.init;
    CooladataLib.prototype['track_event'] = CooladataLib.prototype.trackEvent;
    CooladataLib.prototype['track_event_later'] = CooladataLib.prototype.trackEventLater;
    CooladataLib.prototype['flush'] = CooladataLib.prototype.flush;
    CooladataLib.prototype['track_pageload'] = CooladataLib.prototype.track_pageload;
    CooladataLib.prototype['set_config'] = CooladataLib.prototype.set_config;
    CooladataLib.prototype['get_config'] = CooladataLib.prototype.get_config;
    CooladataLib.prototype['toString'] = CooladataLib.prototype.toString;

    // Initialization
    if (_.isUndefined(cooladata)) {
        // cooladata wasn't initialized properly, report error and quit
        console.critical("'cooladata' object not initialized. Ensure you are using the latest version of the Cooladata JS Library along with the snippet we provide.");
        return;
    }
    if (cooladata['__loaded'] || cooladata['config']) {
        // lib has already been loaded at least once; we don't want to override the global object this time so bomb early
        windowConsole.log("Cooladata library has already been downloaded at least once.");
        return;
    }
    if (SNIPPET_VERSION < 1.1) {
        // cooladata wasn't initialized properly, report error and quit
        windowConsole.critical("Version mismatch; please ensure you're using the latest version of the Cooladata code snippet.");
        return;
    }

    // Load instances of the Cooladata Library
    var instances = {};
    _.each(cooladata['_i'], function (item) {
        var name, instance;
        if (item && _.isArray(item)) {
            name = item[item.length - 1];
            instance = create_cooladatalib.apply(this, item);

            instances[name] = instance;
        }
    });

    var extend_cd = function () {
        // add all the sub cooladata instances
        _.each(instances, function (instance, name) {
            if (name !== PRIMARY_INSTANCE_NAME) { cooladata[name] = instance; }
        });

        // add private functions as _
        cooladata['_'] = _;
    };

    // we override the snippets init function to handle the case where a
    // user initializes the cooladata library after the script loads & runs
    cooladata['init'] = function (token, config, name) {
        if (name) {
            // initialize a sub library
            if (!cooladata[name]) {
                cooladata[name] = instances[name] = create_cooladatalib(token, config, name);
                cooladata[name]._loaded();
            }
        } else {
            var instance = cooladata;

            if (instances[PRIMARY_INSTANCE_NAME]) {
                // main cooladata lib already initialized
                instance = instances[PRIMARY_INSTANCE_NAME];
            } else if (token) {
                // intialize the main cooladata lib
                instance = create_cooladatalib(token, config, PRIMARY_INSTANCE_NAME);
                if (instance)
                    instance._loaded();
            }

            window[PRIMARY_INSTANCE_NAME] = cooladata = instance;
            extend_cd();
        }
    };

    cooladata['init']();

    // Fire loaded events after updating the window's cooladata object
    _.each(instances, function (instance) {
        instance._loaded();
    });

    // Cross browser DOM Loaded support

    function dom_loaded_handler() {
        // function flag since we only want to execute this once
        if (dom_loaded_handler.done) { return; }
        dom_loaded_handler.done = true;

        DOM_LOADED = true;
        ENQUEUE_REQUESTS = false;

        _.each(instances, function (inst) {
            inst._dom_loaded();
        });
    }

    if (document.addEventListener) {

        if (document.readyState == "complete") {
            // safari 4 can fire the DOMContentLoaded event before loading all
            // external JS (including this file). you will see some copypasta
            // on the internet that checks for 'complete' and 'loaded', but
            // 'loaded' is an IE thing
            dom_loaded_handler();
        } else {
            document.addEventListener("DOMContentLoaded", dom_loaded_handler, false);
        }
    } else if (document.attachEvent) {
        // IE
        document.attachEvent("onreadystatechange", dom_loaded_handler);

        // check to make sure we arn't in a frame
        var toplevel = false;
        try {
            toplevel = window.frameElement == null;
        } catch (e) { }

        if (document.documentElement.doScroll && toplevel) {
            function do_scroll_check() {
                try {
                    document.documentElement.doScroll("left");
                } catch (e) {
                    setTimeout(do_scroll_check, 1);
                    return;
                }

                dom_loaded_handler();
            };

            do_scroll_check();
        }
    }

    // fallback handler, always will work
    _.register_event(window, 'load', dom_loaded_handler, true);


})(window['cooladata']);
