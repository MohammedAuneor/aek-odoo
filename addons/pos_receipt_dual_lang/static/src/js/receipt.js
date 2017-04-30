odoo.define('pos_receipt_dual_lang', function (require) {
    var core = require('web.core');
    var _t = core._t;
    var QWeb = core.qweb;
    var session = require('web.session');

    var Model = require('web.Model');
    var translation = require('web.translation');
    var screens = require('point_of_sale.screens');

    QWeb.preprocess_node = function() {
        // Note that 'this' is the Qweb Node
        switch (this.node.nodeType) {
            case Node.TEXT_NODE:
            case Node.CDATA_SECTION_NODE:
                // Text and CDATAs
                var translation = this.node.parentNode.attributes['t-translation'];
                if (translation && translation.value === 'off') {
                    return;
                }
                var match = /^(\s*)([\s\S]+?)(\s*)$/.exec(this.node.data);
                if (match) {
                    if(this.attributes['swap-lang']){
                        _t.database.swap_active = true;
                    }
                    this.node.data = match[1] + _t(match[2]) + match[3];
                    if(this.attributes['swap-lang']){
                        _t.database.swap_active = false;
                    }
                }
                break;
            case Node.ELEMENT_NODE:
                // Element
                var attr, attrs = ['label', 'title', 'alt', 'placeholder'];
                while ((attr = attrs.pop())) {
                    if (this.attributes[attr]) {
                        if(this.attributes['swap-lang']){
                            _t.database.swap_active = true;
                        }
                        this.attributes[attr] = _t(this.attributes[attr]);
                        if(this.attributes['swap-lang']){
                            _t.database.swap_active = false;
                        }
                    }
                }
        }
    }

    translation.TranslationDataBase.include({
        init: function() {
            this._super();
            this.swap_db = false;
            this.swap_active = false;
        },
        get: function(key) {
            if(this.swap_db && this.swap_active){
                return this.swap_db[key];
            }
            return this.db[key];
        },
        swap: function(swap_db){
            var ret = {};
            for(var key in swap_db){
                if(this.db[key]){
                    ret[this.db[key]] = swap_db[key];
                } else {
                    ret[key] = swap_db[key];
                }
            }
            this.swap_db = ret;
        }
    });

    var _t_dual = false;
    session.on('module_loaded', this, function () {
        new Model("ir.config_parameter").call("get_param", ["pos_receipt_dual_lang"]).then(function(dual_lang) {
            if (!!dual_lang) {
                _t_dual = new translation.TranslationDataBase().build_translation_function();
                self.rpc('/pos/translations', {mods: null, lang: dual_lang}).then(function(trans) {
                    _t_dual.database.set_bundle(trans);
                    translation._t.database.swap(_t_dual.database.db);
                });
            }
        });

    });

    screens.ReceiptScreenWidget.include({
        render_receipt: function() {
            var order = this.pos.get_order();
            var receipt_data = {
                widget:this,
                order: order,
                receipt: order.export_for_printing(),
                orderlines: order.get_orderlines(),
                paymentlines: order.get_paymentlines(),
                _t_dual: _t_dual,
            };
            this.$('.pos-receipt-container').html(QWeb.render('PosTicket', receipt_data));
        }
    })

});
// vim:et fdc=0 fdl=0: