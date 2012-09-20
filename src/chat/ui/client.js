goog.provide('chat.ui.Client');

goog.require('goog.ui.Dialog');
goog.require('goog.ui.TabBar');
goog.require('goog.ui.Tab');
goog.require('goog.ui.RoundedTabRenderer');

goog.require('xmpptk.ui');
goog.require('xmpptk.ui.View');
goog.require('xmpptk.ui.emoticons');

goog.require('chat.ui.Roster');

/**
 * @constructor
 * @extends {xmpptk.ui.View}
 */
chat.ui.Client = function(subject) {
    xmpptk.ui.View.call(this, subject);

    subject.subscribe('login', function(error) {
        var form = goog.dom.createDom(
            'form', {},
            goog.dom.createDom('div', {},
                               'Username (JID)', ': ',
                               goog.dom.createDom('input', {type: 'text', name: 'username'})),
            goog.dom.createDom('div', {},
                               'Password', ': ',
                               goog.dom.createDom('input', {type: 'password', name: 'password'})));

        var dialog = new goog.ui.Dialog();
        dialog.setTitle('Login');
        dialog.setContent(goog.dom.getOuterHtml(form));
        dialog.setButtonSet(goog.ui.Dialog.ButtonSet.createOk());
        dialog.setVisible(true);
    });

    subject.subscribe('loggedIn', function() {
        xmpptk.ui.emoticons.init(xmpptk.getConfig('emoticons_path'));
        this.render(goog.dom.getElement(xmpptk.getConfig('DOMchatElement')));
        this._rosterUI = new chat.ui.Roster(subject.roster);
    }, this);

    subject.subscribe('selectRosterItem', function(itemView) {
        this._rosterUI.setSelected(itemView);
    }, this);

    subject.subscribe('openChat', function(item) {
        var id = xmpptk.ui.fixID(item.getId());
        if (!this.tabBar.getChild(id)) {
            subject.addChatSession(item.getId());
        } else {
            this._logger.info("tab exists but hidden");
            this.tabBar.getChild(id).setVisible(true);
            this.tabBar.setSelectedTab(this.tabBar.getChild(id));
        }

    }, this);

    subject.subscribe('chatSession', function(chatSession) {
        var tab = new goog.ui.Tab(
            xmpptk.ui.cut(chatSession.entity.name,
                          xmpptk.getConfig('nick_max_length', 8)),
            new goog.ui.RoundedTabRenderer());
        tab.setId(xmpptk.ui.fixID(chatSession.entity.getId()));
        this.tabBar.addChild(tab,true);
        this.tabBar.setSelectedTab(tab);
        tab.chatSession = new chat.ui.ChatSession(chatSession, tab);

        goog.events.listen(
            tab.getElement(),
            goog.events.EventType.DBLCLICK,
            function() {
                this._logger.info("dblclicked");
                tab.chatSession.show(false);
                tab.setVisible(false);
            },
            true,
            this);
    }, this);
};
goog.inherits(chat.ui.Client, xmpptk.ui.View);

chat.ui.Client.prototype._logger = goog.debug.Logger.getLogger('chat.ui.Client');

chat.ui.Client.prototype.render = function(parent) {
    goog.dom.removeChildren(parent);

    var clientDiv = goog.dom.createDom('div', {'id': 'chatClient'},
                                       goog.dom.createDom('div', {'id':'tabBar'}),
                                       goog.dom.createDom('div', {'class': 'goog-tab-bar-clear'}),
                                       goog.dom.createDom('div', {'id': 'roster'}),
                                       goog.dom.createDom('div', {'id': 'chatSessions'})
                                      );
    goog.dom.appendChild(parent, clientDiv);

    this.tabBar = new goog.ui.TabBar();
    this.tabBar.render(goog.dom.getElement('tabBar'));

    this._lastTabSelected = null;
    goog.events.listen(
        this.tabBar,
        goog.ui.Component.EventType.SELECT,
        goog.bind(function(e) {
            var tabSelected = e.target;
            this._logger.info("tab selected for "+tabSelected.getId());
            if (this._lastTabSelected) {
                this._lastTabSelected.chatSession.show(false);
            }
            if (tabSelected.chatSession)
                tabSelected.chatSession.show(true);
            this._lastTabSelected = tabSelected;
        }, this)
    );
    
    parent.scrollIntoView();
};