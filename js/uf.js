//$(document).ready(function() {

 $(window).scroll(function() {
    $('video').each(function(){
        if ($(this).is(":in-viewport( -20 )")) {
            $(this)[0].pause();
        } else {
            $(this)[0].play();
        }
    })
    });
//})