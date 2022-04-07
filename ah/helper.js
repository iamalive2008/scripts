
$(function () {
    console.log("AHHelper JS Started!")

    warpper = $("<div>").addClass("ahh-wrapper").html("Loading......");;
    $("body").prepend(warpper);
    setInterval(function () {
        worker()
    }, 3000);


    function worker() {
        console.log("workder")
    }
});