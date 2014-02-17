/*

Display provides the layer that sits between the html and the rest of the code

*/

function Display()
{
	var progInd = null;
	var flipButton = null;
}

Display.prototype = 
{
	// setup our flip and progress indicator controls
	init : function(doneButtonOnClick, designPreferences)
	{
		// create the done button on the back
		var doneButton = document.getElementById('done');
		createGenericButton(doneButton, 'Done', doneButtonOnClick);
		
		// create the flip button on the front
		this.flipButton = new FlipButton();
		this.flipButton.flipInner = document.getElementById('flip');
		this.flipButton.flipOuter = document.getElementById('fliprollie');

		// create the progress indicator for the front
		this.progInd = new ProgressIndicator(document.getElementById('progressInd'), "images/prog");

		// shuffle things around as defined by the skin
		this.applySkin(designPreferences);
	},	


	// updates the display with the given count and changes the background picture accordingly
	displayMessageCount : function(messageCount)
	{
		debug('updating display with ' + messageCount + ' unread messages');

		var stampBackground = document.getElementById("mainImage");

		if (messageCount > 0)
		{
			stampBackground.src="message.png"
		}
		else
		{
			stampBackground.src="Default.png"
		}

		if (messageCount > 8)
		{
			this.setCountDisplay("9<div id='plus' onclick='gotoInbox();'>+</div>",true);
		}
		else if (messageCount >= 0)
		{
			this.setCountDisplay(messageCount,false);
		}
		else
		{
			this.setCountDisplay('-',false);
		}
	},


	// updates the div that hold the count
	setCountDisplay : function(messageToDisplay, moreRoomRequired)
	{
		var messageCount = document.getElementById('messageCount');
		messageCount.innerHTML = messageToDisplay;
		
		if (moreRoomRequired)
		{
			messageCount.style.left = designPreferences.messageCountLeft - 2;
		}
		else
		{
			messageCount.style.left = designPreferences.messageCountLeft;
		}
	},


	// turns the widget over (to end up oon the preferences panel)
	flipToBack : function()
	{
		var front = document.getElementById("front");
		var back = document.getElementById("prefs");
	
		// set widget size and freeze display
		if (window.widget)
		{
			widget.prepareForTransition("ToBack");
		}

		// turn off front - turn on back
		front.style.display="none";
		back.style.display="block";

		// focus on the username field
		document.getElementById("usernameField").focus();

		// flip the widget over
		if (window.widget)
		{
			setTimeout('widget.performTransition();', 0);
		}

		this.unhighlightFlipButton();
		this.hideFlipButton();
	},
	

	// turns the widget over (to end up on the face of the stamp)
	flipToFront : function()
	{
		var front = document.getElementById("front");
		var back = document.getElementById("prefs");

		// set widget size and freeze display
		if(window.widget)
		{
			widget.prepareForTransition("ToFront");
		}

		// turn off back - turn on front
		back.style.display="none";
		front.style.display="block";

		// flip the widget over
		if (window.widget)
		{
			setTimeout('widget.performTransition();', 0);
		}
	},	


	// fade in the info button
	showFlipButton : function()
	{
		this.flipButton.showInfoButton();
	},


	// fade out the info button	
	hideFlipButton : function()
	{
		this.flipButton.hideInfoButton();
	},


	// highlight info button (for mouse over)
	highlightFlipButton : function()
	{
		document.getElementById('fliprollie').style.display = 'block';
	},


	// remove highlight from info button (for mouse out)
	unhighlightFlipButton : function()
	{
		document.getElementById('fliprollie').style.display = 'none';
	},


	// starts the progress indicator spinning
	startProgressIndicator : function()
	{
		this.progInd.start();
	},


	// stops the progress indicator from spinning
	stopProgressIndicator : function()
	{
		this.progInd.stop();
	},


	// gets the username from the field on the prefs
	getUsername : function()
	{
		return document.getElementById("usernameField").value;
	},


	// gets the password from the field on the prefs
	getPassword : function()
	{
		return document.getElementById("passwordField").value;
	},


	// sets the username in the field on the prefs
	setUsername : function(username)
	{
		document.getElementById("usernameField").value = username;
	},


	// sets the password in the field on the prefs
	setPassword : function(password)
	{
		document.getElementById("passwordField").value = password;
	},


	// changes the layout and color of the elements to match the design
	applySkin : function (designPreferences)
	{
		// shuffle everything to the correct positions (as determined by the designPreferences)
		var progIndElement = document.getElementById('progressInd');
		if (designPreferences.progressIndicatorTop)
			progIndElement.style.top = designPreferences.progressIndicatorTop + "px";
		if (designPreferences.progressIndicatorLeft)
			progIndElement.style.left = designPreferences.progressIndicatorLeft + "px";

		var messageCountElement = document.getElementById("messageCount");
		if (designPreferences.messageCountTop)
			messageCountElement.style.top = designPreferences.messageCountTop + "px";
		if (designPreferences.messageCountLeft)
			messageCountElement.style.left = designPreferences.messageCountLeft + "px";

		// set the message count color
		if (designPreferences.messsageCountColor)
		{
			messageCountElement.style.color = designPreferences.messsageCountColor;
		}

		if (designPreferences.orientation == "landscape") this.rotateWidget();

		// set the info button color
		if (designPreferences.flipButtonColor != "white")
		{
			document.getElementById('fliprollie').style.backgroundImage = "url(/System/Library/WidgetResources/ibutton/"+designPreferences.flipButtonColor+"_rollie.png)";
			document.getElementById('flip').style.backgroundImage = "url(/System/Library/WidgetResources/ibutton/"+designPreferences.flipButtonColor+"_i.png)";
		}
	},

	// moves the prefs controls when the widget is in landscape mode
	rotateWidget : function()
	{
		document.getElementById('usernameLabel').style.top = "10px";
		document.getElementById('usernameField').style.top = "19px";
		document.getElementById('usernameField').style.width = "95px";
		document.getElementById('passwordLabel').style.top = "40px";
		document.getElementById('passwordField').style.top = "49px";
		document.getElementById('passwordField').style.width = "95px";
		document.getElementById('done').style.top = "72px";
		document.getElementById('done').style.left = "61px";

		document.getElementById('flip').style.top = "78px";
		document.getElementById('flip').style.left = "98px";
		document.getElementById('fliprollie').style.top = "78px";
		document.getElementById('fliprollie').style.left = "98px";
	}
}
