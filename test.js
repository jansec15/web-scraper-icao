
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
    const start = new Date();
    await sleep(1000)
    const end = new Date() - start;
    console.log(end)
}
test();