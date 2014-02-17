/*

code to drive the flip button (little info thing in the corner)

*/

function FlipButton()
{
	// html elements
	var flipBack = null;
	var flipInner = null;
	
	// animation object
	var flipAnimator = null;
	// current flip status
	var flipShown = false;
}

FlipButton.prototype =
{
	show : function()
	{
		document.getElementById('fliprollie').style.display = 'block';
	},
	
	hide : function()
	{
		document.getElementById('fliprollie').style.display = 'none';
	},


	// flip code for the prefs button
	showInfoButton : function()
	{
		if (!this.flipShown)
		{
			var flipAnimator = this.flipAnimator;
			// create new Animator the first time
			if (flipAnimator == null)
			{
				this.flipAnimator = new Animator();
				flipAnimator = this.flipAnimator;
	
				flipAnimator.element = this.flipInner;
				flipAnimator.from = 0.0;
				flipAnimator.whenfinished = null;
				localThis = this;
				flipAnimator.animationStep = function(element, newValue) {localThis.flipSetOpacity(element,newValue)};
			}
			else
			{
				flipAnimator.pauseAnimation();
				flipAnimator.from = flipAnimator.now;
				// todo: should we be changing the duration here? newDur = currentDur - done?
			}
			flipAnimator.to = 1.0;
			flipAnimator.startAnimation();
	
			this.flipShown = true;
		}
	},
	
	hideInfoButton : function()
	{
		if (this.flipShown)
		{
			var flipAnimator = this.flipAnimator;
			// create new Animator the first time
			if (flipAnimator == null)
			{
				this.flipAnimator = new Animator();
				flipAnimator = this.flipAnimator;
	
				flipAnimator.element = this.flipInner;
				flipAnimator.from = 1.0;
				flipAnimator.whenfinished = null;
				localThis = this;
				flipAnimator.animationStep = function(element, newValue) {localThis.flipSetOpacity(element,newValue)};
			}
			else
			{
				flipAnimator.pauseAnimation();
				flipAnimator.from = flipAnimator.now;
				// todo: should we be changing the duration here? newDur = currentDur - done?
			}
			flipAnimator.to = 0.0;
			flipAnimator.startAnimation();
	
			this.flipShown = false;
		}
	},

	flipSetOpacity : function(flip, opacity)
	{
		flip.style.opacity = opacity;
	}
}
