$(function () {
    console.log("AHHelper JS Started!")

    warpper = $("<div>").addClass("ahh-wrapper").html("疫苗助手加载成功");
    $("body").prepend(warpper);
    setInterval(function () {
        worker()
    }, 3000);


    function worker() {
         notice(new Date().toLocaleString())
         hideModalIfNeeded()
    }


    // 关闭弹窗
    function hideModalIfNeeded() {
        $(".modal-wrapper:visible").each(function () {
            text = $(this).text()
            if (text.includes("接种须知")) {
                $(this).hide()
                notice("关闭接种须知弹窗")
            }
        });
    }

    // 显示消息
    function notice(msg) {
        console.log(msg)
        $(".ahh-wrapper").html(msg);
    }
});