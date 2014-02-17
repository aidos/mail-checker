function YahooAccess() {
	// method to call when we're done checking for mail (expects one argument - number of unread messages)
	this.onFinishedLookup = null;

	// un/pw
	this.username = null;
	this.password = null;

	// polling/connection stuff
	this.giveUpAfter = 10000;

	// helpers
	this.reqObj = null;
	this.systemReq = null;
	this.countDown = null;
	this.whenGivenUp = null;

	// things we need to know to get the mail count
	this.baseCookie = null;
	this.yahooCookie = null;
	this.verificationDone = false;
	this.countUrl = null;
}


YahooAccess.prototype =
{
	// clears the cookie cache in this case
	reset : function()
	{
		debug('clearing existing cookies (and urls)');
		this.baseCookie = null;
		this.yahooCookie = null;
		this.verificationDone = false;
		this.countUrl = null;
	},

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

	// returns the url for accessing the inbox
	getInboxURL : function(username, password)
	{
		this.username = username;
		this.password = password;

		// we need to logout first
		var inboxAddress = "http://mail.yahoo.com";
		var loginAddress = "https://login.yahoo.com/config/login?login="+this.username+"&Passwd="+this.password+"&.done="+escape(inboxAddress);
		var logoutAddress = "https://login.yahoo.com/config/login?logout=1&.direct=1&.done="+escape(loginAddress);

		return logoutAddress;
	},

	refreshCount : function(username, password)
	{
		this.username = username;
		this.password = password;
		this.checkNow();
	},

	checkNow : function()
	{
/*		if (!this.baseCookie)
			this.makeRequest("basecookie");
		else */
		if (!this.yahooCookie)
			this.makeRequest("cookie");
		else if (!this.verificationDone && false)
			this.makeRequest("verification");
		else if (!this.countUrl)
			this.makeRequest("counturl");
		else
			this.makeRequest("mailcount");
	},
	
	makeRequest : function(requestType)
	{
		var url, cookie, afterRequest;
		var viaCurl = false;

		switch (requestType)
		{
			case "basecookie":
				debug('attempting to fetch base cookie');
				url = "http://mail.yahoo.com";
				cookie = "a=a";
				afterRequest = this.postGetBaseCookie;
				break;
			case "cookie":
				debug('attempting to fetch master cookie');
				url = "https://login.yahoo.com/config/login?login="+this.username+"&passwd="+this.password+"&.done=http%3a//mail.yahoo.com";
//				cookie = this.baseCookie;
				afterRequest = this.postGetCookie;
				break;
			case "verification":
				debug('attempting verification');
				url = "https://login.yahoo.com/config/verify?.done=http%3a//mail.yahoo.com";
				cookie = this.yahooCookie;
				afterRequest = this.postDoCookieVerification;
				break;
			case "counturl":
				debug('attempting to find count url');
				url = "http://mail.yahoo.com";
				cookie = this.yahooCookie;
				afterRequest = this.postGetCountUrl;
				viaCurl = true;
				break;
			case "mailcount":
				debug('attempting to get mail count');
				url = this.countUrl;
				cookie = this.yahooCookie;
				afterRequest = this.postGetMailCount;
				break;
		}
	
		// we're going to give up looking after 8 seconds
		var postRequestFunction = this.buildPostRequestFunction(afterRequest);

		if (viaCurl)
		{
			this.requestPageHeaders(url, cookie, afterRequest);
		}
		else
		{
			this.requestPage(url, cookie, postRequestFunction);
		}
	},

	buildPostRequestFunction : function(afterRequest)
	{
		var localThis = this;
		return function()
			{
				if (localThis.reqObj.readyState == 4 && localThis.reqObj.status == 200)
				{
					// stop the countdown code
					clearTimeout(localThis.whenGivenUp);
					localThis.whenGivenUp = null;

					// call the appropriate post function
					afterRequest(localThis);
				}
			};
	},

	requestPage : function(url, cookie, afterRequest)
	{
		this.reqObj = new XMLHttpRequest();
		this.reqObj.open("GET", url, true);
		this.reqObj.setRequestHeader("Cache-Control", "no-cache");
		this.reqObj.setRequestHeader("Accept", "*/*");
		if (cookie)
			this.reqObj.setRequestHeader("Cookie", cookie);
		this.reqObj.onreadystatechange = afterRequest;
		this.reqObj.send(null);

		var localThis = this;

		// give up after a few seconds
		clearTimeout(this.whenGivenUp);
		this.whenGivenUp = setTimeout(function() {localThis.giveUpLooking();},this.giveUpAfter);
	},

	requestPageHeaders : function(url, cookie, afterRequest)
	{
		var curlCall = "/usr/bin/curl --head"
		if (cookie)
			curlCall += " -b \"" + cookie + "\"";
		curlCall += " \"" + url + "\"";
		this.systemReq = widget.system(curlCall, function(results) {afterRequest(localThis,results);});

		var localThis = this;

		// give up after a few seconds
		clearTimeout(this.whenGivenUp);
		this.whenGivenUp = setTimeout(function() {localThis.giveUpLooking();},this.giveUpAfter);
	},


	postGetBaseCookie : function(localThis)
	{
		var responseCookies = localThis.reqObj.getResponseHeader("set-cookie");

		// if we don't have a cookie then assume that something has gone wrong
		if (!responseCookies) {
			debug('could not find base cookie');
			localThis.giveUpLooking();
			return;
		}

		responseCookies = localThis.extractCleanedCookie(responseCookies);
		localThis.baseCookie = responseCookies;

		debug('got base cookie');

		// now we can move on to the next request
		localThis.checkNow();
	},	

	postGetCookie : function(localThis)
	{
		var responseCookies = localThis.reqObj.getResponseHeader("set-cookie");

		// if we don't have a cookie then assume that the login failed
		if (!responseCookies) {
			debug('could not get master cookie');
			localThis.giveUpLooking();
			return;
		}

		//debug('Server response: '+this.servReq.responseText);

		responseCookies = localThis.extractCleanedCookie(responseCookies);
		localThis.yahooCookie = responseCookies;

		debug('got master cookie');

		// now we can move on to the next request
		localThis.checkNow();
	},

	postDoCookieVerification : function(localThis)
	{
		debug('done verification');
		localThis.verificationDone = true;

		// now we can move on to the next request
		localThis.checkNow();
	},

	postGetCountUrl : function(localThis, result)
	{
		// incomplete - not using this function
		debug('got count url');

		var header = result.outputString;
		var location = header.match(/location: [^$]*/ig);
		
		if (!location)
		{
			debug('could not find count url');
			localThis.giveUpLooking();
		}
		else
		{
			location = location[0];
			location = location.substring(10);
			localThis.countUrl = location;
		}

		// now we can move on to the next request
		localThis.checkNow();
	},

	postGetMailCount : function(localThis)
	{
		debug('done get mail count');

		var mailCount = -1;

		// try to figure out the mail count
//		debug(localThis.reqObj.responseText);
		mailCount = localThis.extractUnreadCount(localThis.reqObj.responseText);

		// make the call back to the MailChecker object
		localThis.onFinishedLookup(mailCount);
	},

	// get email count from html
	extractUnreadCount : function(pageHTML)
	{
		var newMails = pageHTML.match(/ \(\d*\)/ig);

		if(!newMails)
		{
			// check to see if maybe they just don't have any mail
			newMails = pageHTML.match(/inbox/ig);

			if (newMails)
			{
				return 0;
			}
			else
			{
				this.giveUpLooking();
			}
		}
		else
		{
			var justNumber = newMails[0].substring(2);
			justNumber = justNumber.substring(0,justNumber.length-1);
			//debug('unread number as string: ' + justNumber);
			return parseInt(justNumber);
		}
	},

	giveUpLooking : function()
	{
		debug('given up looking!');
		// give up checking
		if (this.reqObj)
			this.reqObj.abort()
		this.reqObj = null;
		
		if (this.systemReq)
			this.systemReq.cancel();
		this.systemReq = null;

		// let MailChecker know that we've given up
		this.onFinishedLookup(-1);
	},

	extractCleanedCookie : function(cookie)
	{
		// create a clean version of the returned cookie
		var cookies = cookie.split('.com,');
		for (var i = 0; i < cookies.length; i++) {
			cookies[i] = cookies[i].split(";")[0];
			if (i < cookies.length - 1)
				cookies[i] += ";";
		}
		return cookies.join("");
	}

}
