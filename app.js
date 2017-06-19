const phantom = require('phantom');
const fs = require('fs');

const url = 'http://emart.ssg.com/';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async function() {
    const instance = await phantom.create(['--ignore-ssl-errors=yes', '--load-images=no']);
    const page = await instance.createPage();
    await page.on("onResourceRequested", function(requestData) {
        console.info('Requesting', requestData.url)
    });

    let status = await page.open(url);
    console.log(status);

    const categories = await page.evaluate(function() {
        const result = []
        const lists = document.querySelectorAll('#category_food ul.lst_b li')
        for (var i = 0, len = lists.length; i < len; i++) {
            const list = lists[i].children[0]
            result.push({ title: list.innerText, code: list.href.split('\'')[1] })
        }
        return result
    })

    const openCategories = async function(i, max) {
        if (i === max) { return }

        await wait(5000)
        const currentUrl = url + 'category/listCategoryItem.ssg?dispCtgId=' + categories[i].code
        status = await page.open(currentUrl)
        if (status !== 'success') {
            console.log("Error opening url : " + currentUrl);
        } else {
            const counts = await page.evaluate(function() {
                return document.querySelector('.tit em').innerText
            })
            console.log(categories[i].title + ' : ' + counts);
            const items = await page.evaluate(function() {
                const result = []
                const lists = document.querySelectorAll('table.lst_item .item_info')
                for (var j = 0, max = lists.length; j < max; j++) {
                    const title = lists[j].children[1].children[0].children[1].title
                    const price = lists[j].children[2].children[0].innerText
                    result.push({ title: title, price: price })
                }
                return result
            })

            await fs.writeFile('categories/item' + categories[i].code + '.json', JSON.stringify(items), 'utf8')
            console.log('success to write a file');
        }

        return await openCategories(i+1, max)
    }

    await openCategories(0, categories.length)

    await instance.exit()
}())
