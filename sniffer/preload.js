if (!sessionStorage._check_enable) {
    sessionStorage._check_enable = '0';
}

function snifferCheck() {
    log("正在执行js的snifferCheck");
    let src = document.querySelectorAll("iframe")[1];
    if (src) {
        sessionStorage._check_enable = '1';
        location.href = src.src;
    } else {
        setTimeout(snifferCheck, 200);
    }
}

if (location.href.includes("v.nmvod.cn")) {
    snifferCheck();
}

function snifferCheck2() {
    log("正在执行js的snifferCheck2");
    let a = document.querySelector("#lines ul a");
    if (a) {
        a.click();
    } else {
        setTimeout(snifferCheck2, 200);
    }
}

if (!location.href.includes("v.nmvod.cn") && sessionStorage._check_enable === '1') {
    snifferCheck2();
}