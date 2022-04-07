
$(function () {
    console.log("AHHelper JS Started!")

    warpper = $("<div>").addClass("ahh-wrapper").html("疫苗助手加载成功");
    $("body").prepend(warpper);
    setInterval(function () {
        worker()
    }, 3000);


    function worker() {
        console.log("workder")
        notice(new Date().toLocaleString())
    }


    // 显示消息
    function notice(msg) {
        $(".ahh-wrapper").html(msg); 
    }
});