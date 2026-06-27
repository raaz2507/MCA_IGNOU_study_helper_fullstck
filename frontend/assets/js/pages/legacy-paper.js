const sharedTheme = localStorage.getItem("study-helper-theme") || "sepia";
if (["light", "dark", "sepia"].includes(sharedTheme)) {
	document.documentElement.dataset.theme = sharedTheme;
}

/*
        const headers =document.getElementsByTagName("header");
        [...headers].forEach(header=>{
            header.innerHTML = `<h2>MCSL-216 (Set-${header.dataset["set"]})</h2>
            <h3>MASTER OF COMPUTER APPLICATIONS (MCA-NEW)</h3>
            <h4>DAA and Web Design Lab</h4>
            <h5 style="float:left">Duration : 2 hours</h5>
            <h5 style="float:right;">Maximum Marks : 50</h5>
            <hr style="clear: both;">`;
        });
		
        const pages = document.getElementsByClassName("page");
        [...pages].forEach(page=>{
            const header =  page.getElementsByTagName('header')[0];
            const instructions = document.createElement('div');
            instructions.className = "instructions";
            instructions.innerHTML = `<div class="instructions">
                <p class="instructions_title" >Note: </p>
                <ol type="1" >
                    <li>This question paper comprises of two Compulsory Questions, each of 20 marks.</li>
                    <li>Rest 10 marks are for viva-voce.</li>
                </ol>
            </div>`
            page.insertBefore( instructions, page.firstChild.nextSibling.nextSibling);
        });
		*/
const footers = document.getElementsByTagName("footer");
[...footers].forEach((footer) => {
	footer.innerHTML = `******`;
});

/* active nav script start */

const nav = document.querySelector("nav");
const navToggle = document.querySelector("#navToggle");

const fragment = document.createDocumentFragment();
const pages = document.querySelectorAll("div.page");

pages.forEach((page, index) => {
	if (!page.id) {
		page.id = `page${index + 1}`;
	}

	const anchor = document.createElement("a");
	anchor.textContent = `Paper ${page.dataset.set || index + 1}`;
	anchor.href = `#${page.id}`;

	fragment.append(anchor);
});

nav.append(fragment);

const sections = document.querySelectorAll("div.page");
const links = document.querySelectorAll("nav a");

let lastScroll = window.scrollY;
let isAnchorScrolling = false;

/* mobile nav toggle */
navToggle.addEventListener("click", () => {
	nav.classList.toggle("show");
});

/* nav link click scroll को user-scroll मत मानो */
links.forEach((link) => {
	link.addEventListener("click", () => {
		isAnchorScrolling = true;
		nav.classList.remove("hide");

		setTimeout(() => {
			isAnchorScrolling = false;
			lastScroll = window.scrollY;
		}, 900);
	});
});

/* active link update + desktop hide/show */
window.addEventListener("scroll", () => {
	const currentScroll = window.scrollY;
	let current = "";

	sections.forEach((section) => {
		const top = section.offsetTop - 120;

		if (currentScroll >= top) {
			current = section.id;
		}
	});

	links.forEach((link) => {
		link.classList.remove("active");
		link.removeAttribute("aria-current");

		if (link.getAttribute("href") === `#${current}`) {
			link.classList.add("active");
			link.setAttribute("aria-current", "page");
		}
	});

	if (window.innerWidth > 768) {
		if (isAnchorScrolling) {
			nav.classList.remove("hide");
			return;
		}

		if (currentScroll > lastScroll && currentScroll > 100) {
			nav.classList.add("hide");
		} else {
			nav.classList.remove("hide");
		}
	} else {
		nav.classList.remove("hide");
	}

	lastScroll = currentScroll;
});

window.dispatchEvent(new Event("scroll"));

/* active nav script end */
