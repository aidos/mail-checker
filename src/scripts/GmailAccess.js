function GmailAccess() {
	// method to call when we're done checking for mail (expects one argument - number of unread messages)
	this.onFinishedLookup = null;

	// polling/connection stuff
	this.giveUpAfter = 10000;
	this.servReq = null;
	this.whenGivenUp = null;

	// encoded username/password combination
	this.base64Auth = '';

  // google auth token
	this.authToken = null;
}

GmailAccess.prototype =
{

	// open the users inbox in the default browser
  gotoInbox : function (username,password)
    {
		var inboxURL = this.getInboxURL(username, password);

		if (window.widget)
		{
			widget.openURL(inboxURL);
		}
		else
		{
			window.location.href = inboxURL;
		}
	},

  isHosted : function(emailAddress)
  {
    // is this a hosted domain?
	  var splitAddress = emailAddress.toLowerCase().split('@');
	  return splitAddress[1] != "googlemail.com" && splitAddress[1] != "gmail.com";
  },

  baseURL : function(emailAddress)
  {
	  // are they using a hosted domain?
	  var splitAddress = emailAddress.toLowerCase().split('@');
	  if (splitAddress.length > 1 && splitAddress[1] != "googlemail.com" && splitAddress[1] != "gmail.com") {
	    return "http://mail.google.com/a/" + splitAddress[1] + "/";
	  }

    return 'http://mail.google.com/mail/';
  },

	// returns the url for accessing the message xml
	getFeedURL : function()
	{
		return this.baseURL(this.username) + "feed/atom/?auth=" + this.authToken + '&client=photoswarm-gmailchecker-2.0';
	},

	// returns the url for accessing the gmail login page (used to get the user into their email regardless of cookies)
	getInboxURL : function(emailAddress, password)
	{
	  return this.baseURL(emailAddress) + "?search=inbox&source=gmailchecker&client=photoswarm-gmailchecker-2.0&auth=" + this.authToken;
	},

	// start the process of updating the unread count.
	refreshCount : function(username, password)
	{
    // cache the username
	  this.username = username;
	  this.password = password;
	  
    // do we have the authentication tokens?
    if (this.authToken != null)
      return this.refreshCountWithToken();

    // need to get the token
	  var request = new XMLHttpRequest();
	  var localThis = this;
    request.onload = function(e) { localThis.postSID(e, request); }
    request.overrideMimeType("text/plain");

    if (this.isHosted(username))
      request.open("POST", 'https://www.google.com/accounts/ClientLogin');
    else
      request.open("POST", 'https://www.google.com/accounts/ClientAuth');

    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.setRequestHeader("Cache-Control", "no-cache");

    if (this.isHosted(username))
      var params = 'accountType=HOSTED&service=mail&';
    else
      var params = '';

    request.send(params + "Email=" + encodeURI(username) + "&Passwd=" + encodeURI(password) + "&source=gmailchecker");
  },

  postSID : function(e, request)
  {
    // grab the response
    var response = request.responseText;
    
    // pull out the SID and LSID
    var ids = response.split("\n");

    // now get the auth token
    var request = new XMLHttpRequest();
	  var localThis = this;

    request.onload = function(e) { localThis.postAuth(e, request); }
    request.overrideMimeType("text/xml");
    request.open("POST", 'https://www.google.com/accounts/IssueAuthToken');
    request.setRequestHeader("Cache-Control", "no-cache");
    request.send(ids[0] + "&" + ids[1] + "&service=mail");
  },
  
  postAuth : function(e, request) {
    // grab the response
    var response = request.responseText;

    // store the auth token
    this.authToken = response;
    
    // now finally - we can use the service
    this.refreshCountWithToken();
  },

	refreshCountWithToken : function()
	{
		debug('refreshing count');

		var localThis = this;

    if (this.isHosted(this.username)) {
      // hosted - use our python script (imap)
  		var command = widget.system("/usr/bin/python ./scripts/fetch_hosted.py " + this.username + " " + this.password, function(){});
  		command.onreadoutput = function(count){ localThis.fetchFinished(count) };
      command.onreaderror = null;
    } else {
      // normal gmail - can use the atom feeds
  		var atomUrl = this.getFeedURL();

      this.servReq = new XMLHttpRequest();
      this.servReq.onload = function(e) {localThis.updateFromFeed(e, localThis.servReq);}
      this.servReq.overrideMimeType("text/xml");
      this.servReq.open("GET", atomUrl);
      this.servReq.setRequestHeader("Cache-Control", "no-cache");
      this.servReq.send(null);
    }

		// give up after a few seconds
		clearTimeout(this.whenGivenUp);
		this.whenGivenUp = setTimeout(function() {localThis.giveUpLooking();},this.giveUpAfter);
	},

  // called when hosted python script finished
  fetchFinished : function(mailCount) {
    mailCount = parseInt(mailCount);
    
		clearTimeout(this.whenGivenUp);
		this.whenGivenUp = null;
		debug('mailCount: ' + mailCount);

		// make the call back to the MailChecker object
		this.onFinishedLookup(parseInt(mailCount));
  },

	// called when request object finished loading
	updateFromFeed : function(e, request)
	{
		var mailCount = -1;

		clearTimeout(this.whenGivenUp);
		this.whenGivenUp = null;
		debug('Server response: ' + request.responseText);

		mailCount = this.extractUnreadCount(request.responseText);

		// make the call back to the MailChecker object
		this.onFinishedLookup(mailCount);
	},

	giveUpLooking : function()
	{
		debug('given up looking!');
		// give up checking
		this.servReq.abort()
		// let MailChecker know that we've given up
		this.onFinishedLookup(-1);
	},
	
  // get email count from xml
  extractUnreadCount : function(feedXML)
  {
  	newMails = feedXML.match(/<fullcount>(.*?)<\/fullcount>/ig);
  	newMails = newMails[0].replace('<fullcount>','').replace('</fullcount>','');
  	newMails = parseInt(newMails);
  	debug('newMails : ' + newMails.toString());

  	return newMails;
  },

	reset : function()
	{
	}
}
