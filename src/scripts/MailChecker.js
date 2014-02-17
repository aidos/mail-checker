var mailChecker = null;

// called when the widget first loads - just creates an instance of MailChecker
// the MailChecker object then dooes the rest of the work itself
function init() {
	mailChecker = new MailChecker();
	mailChecker.init();

	debugEnabled = false;
	if (window.widget)
	{
		KeyChainAccess.setDebugOn(debugEnabled);
	}
}

// MailChecker basically contains everything about this widget
// an instance is created when this widget first loads
// it takes care of pretty much everything else after that
function MailChecker()
{
	// user details
	this.mailHost = '';
	var username = '';
	var password = '';

	// helper objects
	var display = null;
	var mailAccess = null;
	var persister = null;

	// number of unread messages (-1 = couldn't check)
	var mailCount = -1;

	// polling stuff
	var updateFrequency = -1;
	var refreshInterval = null;
}

MailChecker.prototype = {

	// initial setup of the widget
	// - creates the objects/elements used
	// - retrieves stored user details
	// - starts the mail checking process
	init : function()
	{
		var localThis = this;

		// polling stuff
		this.updateFrequency = 3 * 60000;
		this.refreshInterval = null;

		// this object is used to access all the interface properties
		this.display = new Display();
		this.display.init(function() {localThis.clickDoneButton();}, designPreferences);

		// object to allow us to save/load user details
		this.persister = new Persister();
		this.persister.setApplicationName('MailChecker');

		// retrieve saved configuration
		this.username = this.persister.getPref("username");
		this.password = this.persister.getPassword(this.username);
		this.mailHost = this.deriveMailHost(this.username);
		if (!this.mailHost)
		{
			this.mailHost = "Gmail";
		}

		// push the mailhost, username/password and default mail count to the interface
		this.display.setUsername(this.username);
		this.display.setPassword(this.password);
		this.display.displayMessageCount(this.mailCount);

		// setup the object that talks to the mail servers
		this.createMailAccess();

		// set the event handlers for the widget
		this.setupWidgetEventHandlers();

		// flip over to prefs if we don't have a username/password
		if (!this.loginValid())
		{
			setTimeout(function() {localThis.gotoPrefs();}, 600);
		}
		else
		{
			// otherwise we should have everything required to check for messages now
			this.checkForMessages();
			this.startPolling();
		}
	},

	setupWidgetEventHandlers : function()
	{
		var localThis = this;

		// attach our functions for the events
		if (window.widget)
		{
			widget.onshow = function()
			{
				debug("widget shown");
				
				if (localThis.loginValid())
				{
					// start the regular checks for new messages
					localThis.startPolling();
					// do a check now
					localThis.checkForMessages();
				}
			}
	
			widget.onremove = function()
			{
				debug("widget removed");
				// clear preferences
				localThis.persister.destroyPreferences();
	
				// stop the code that polls for new messages
				localThis.stopPolling();
			}
	
			widget.onhide = function()
			{
				debug("widget hidden");
				// stop the code that polls for new messages
				localThis.stopPolling();
			}
		}
	},

	checkForMessages : function()
	{
		debug("checking for messages");
		this.display.startProgressIndicator();
		this.mailAccess.refreshCount(this.username,this.password);
	},

	// called after finished checking for new messages 
	completedMessageLookup : function(messageCount)
	{
		// update the display
		this.mailCount = messageCount;
		this.display.displayMessageCount(this.mailCount);
		this.display.stopProgressIndicator();
	},

	// start the lookup process
	startPolling : function()
	{
		if (this.refreshInterval == null)
		{
			debug("starting polling (update every "+this.updateFrequency+"ms)");
			var localThis = this;
			this.refreshInterval = setInterval(function() {localThis.checkForMessages();}, this.updateFrequency);
		}
	},
	
	// stop the lookup process
	stopPolling : function()
	{
		if (this.refreshInterval != null)
		{
			debug("stopping polling");
			clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}
	},

	gotoPrefs : function()
	{
		this.display.flipToBack();
	},

	savePreferencesAndFlipToFront : function()
	{
		var newusername = this.display.getUsername();
		var newpassword = this.display.getPassword();
	
		if (newusername != '' && (newusername != this.username || newpassword != this.password))
		{
			// save the password in the keychain
			this.persister.storePref("username",newusername);
			this.persister.storePassword(newusername,newpassword);
		}

		this.username = newusername;
		this.password = newpassword;

		// save the mailHost in the preferences
		var newHost = this.deriveMailHost(this.username);
		if (this.mailHost != newHost)
		{
			this.mailHost = newHost;
			this.createMailAccess();
		}

		if (this.loginValid())
		{
			// reset the account access object (so it can clear cookie cache etc)
			this.mailAccess.reset();

			// check mail now
			this.checkForMessages();
			this.startPolling();
		}
		else 
		{
			this.mailCount = -1;
			this.display.displayMessageCount(this.mailCount);
		}

		this.display.flipToFront();
	},
	
	gotoInbox : function()
	{
		if (this.loginValid())
		{
			var inboxURL = this.mailAccess.getInboxURL(this.username, this.password);
	
			if (window.widget)
			{
				widget.openURL(inboxURL);
			}
			else
			{
				window.location.href = inboxURL;
			}
		}
	},

	loginValid : function()
	{
		var usernameValid = (this.username && (this.username.length > 0));
		var passwordValid = (this.password && (this.password.length > 0));
	
		return (usernameValid && passwordValid);
	},

	createMailAccess : function()
	{
		var localThis = this;

		if (this.mailHost == 'Yahoo')
		{
			this.mailAccess = new YahooAccess();
		} else {
			this.mailAccess = new GmailAccess();
		}

		this.mailAccess.onFinishedLookup = function(messageCount) {localThis.completedMessageLookup(messageCount);};
	},

	// try to figure out which host to use based on the email address
	deriveMailHost : function(emailAddress)
	{
		// default to gmail
		var mailHost = "Gmail";

		var bits = emailAddress.split("@");
		if (bits.length > 1 && bits[1].toLowerCase().indexOf("yahoo") == 0)
		{
			mailHost = "Yahoo";
		}

		return mailHost;
	},

	/*
	
	Functions to handle events that occur on the widget interface
	
	*/

	// save prefs, flip to the front and check for new mail immediately
	keyPressOnPrefs : function(event) {
		var keyCode = event.keyCode ? event.keyCode : event.which ? event.which : event.charCode;
		if (keyCode == 13) {
			this.savePreferencesAndFlipToFront();
		}
	},

	// save prefs, flip to the front and check for new mail immediately
	clickDoneButton : function() {
		this.savePreferencesAndFlipToFront();
	},

	// open the users inbox
	clickFront : function() {
		if (this.loginValid())
		{
			this.gotoInbox();
		}
	},

	mouseOverFront : function()
	{
		this.display.showFlipButton();
	},

	mouseOutFront : function()
	{
		this.display.hideFlipButton();
	},
	
	mouseOverFlip : function()
	{
		this.display.highlightFlipButton();
	},
	
	mouseOutFlip : function()
	{
		this.display.unhighlightFlipButton();
	}

}


var debugEnabled = false;

function debug(text) {
    if (debugEnabled && window.widget) {
        alert(text);
    }
}



// button states are both in the same image, and are swapped by changing
// the clipping area.  Call pressButton(element ID) when a button is pressed,
// and releaseButton(element ID) when it's released.
function pressButton(id) {
    document.getElementById(id).style.backgroundPosition = '0px -21px';
}

function releaseButton(id) {
    document.getElementById(id).style.backgroundPosition = '0px 0px';
}
