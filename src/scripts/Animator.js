// Animator class to perform time based animations

function Animator() {
	this.starttime = 0;
	this.duration = 400;
	this.timer = null;
	this.from = 0;
	this.to = 0;
	this.now = 0;

	// element being animated
	this.element = null;

	// function to call the at each step of animation
	this.animationStep = null;
	// function to call when animation finished
	this.whenfinished = null;
}

// core animation functions
Animator.prototype.animate = Animator_animate;
Animator.prototype.startAnimation = Animator_startAnimation;
Animator.prototype.pauseAnimation = Animator_pauseAnimation;

// helpers for calculating the point in the animation 
Animator.prototype.limit_3 = Animator_limit_3;
Animator.prototype.computeNextFloat = Animator_computeNextFloat;



// implementation details
// ----------------------

function Animator_animate() {
	var T;
	var ease;
	var time = (new Date).getTime();
	var finishedanimation = false;

	T = this.limit_3(time-this.starttime, 0, this.duration);

	if (T >= this.duration) {
		clearInterval(this.timer);
		this.timer = null;
		this.now = this.to;
		finishedanimation = true;
	} else {
		ease = 0.5 - (0.5 * Math.cos(Math.PI * T / this.duration));
		this.now = this.computeNextFloat(this.from, this.to, ease);
	}

	// user defined function
	this.animationStep(this.element, this.now);

	if (finishedanimation) {
		// call the user's post animation function
		if (this.whenfinished != null) {
			setTimeout(this.whenfinished,0);
		}
	}
}

function Animator_startAnimation() {
	var starttime = (new Date).getTime() - 13;
	this.starttime = starttime;

	// run the animation
	var _this = this;
	this.timer = setInterval( function () {_this.animate();}, 13);
	this.animate();
}

function Animator_pauseAnimation() {
	// stop the clock!
	if (this.timer != null) {
		clearInterval(this.timer);
		this.timer = null;
	}
}

function Animator_limit_3(a, b, c) {
    return a < b ? b : (a > c ? c : a);	
}

function Animator_computeNextFloat(from, to, ease) {
    return from + (to - from) * ease;
}
