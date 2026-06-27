import { contributorInitials, getContributors } from "../utils/contributors-store.js";

const grid = document.getElementById("contributorsGrid");
const emptyState = document.getElementById("contributorsEmpty");
const defaultContributorAvatars = {
	rajaanha: "/assets/images/contributors/rajaanha-guinea-pig.png"
};

function contributorCard(contributor) {
	const avatarUrl = contributor.avatar || defaultContributorAvatars[contributor.id] || "";
	const card = document.createElement("article");
	card.className = "contributor-card";
	if (avatarUrl) {
		card.style.setProperty("--contributor-photo", `url("${avatarUrl}")`);
	}

	const topBar = document.createElement("div");
	topBar.className = "contributor-card-topbar";
	const role = document.createElement("span");
	role.textContent = "Contributor";
	const badge = document.createElement("span");
	badge.className = "contributor-card-badge";
	badge.textContent = "*";
	topBar.append(role, badge);

	const avatar = document.createElement("div");
	avatar.className = "contributor-avatar";
	if (avatarUrl) {
		const image = document.createElement("img");
		image.src = avatarUrl;
		image.alt = `${contributor.name} profile`;
		avatar.append(image);
	} else {
		avatar.textContent = contributorInitials(contributor.name);
	}

	const content = document.createElement("div");
	content.className = "contributor-content";
	const name = document.createElement("h3");
	name.textContent = contributor.name;
	const info = document.createElement("p");
	info.textContent = contributor.info;
	content.append(name, info);

	if (contributor.contributions.length) {
		const heading = document.createElement("h4");
		heading.textContent = "Contributions";
		const list = document.createElement("ul");
		contributor.contributions.forEach((entry) => {
			const item = document.createElement("li");
			item.textContent = entry;
			list.append(item);
		});
		content.append(heading, list);
	}

	card.append(topBar, avatar, content);
	return card;
}

const contributors = await getContributors();
if (grid) {
	contributors.forEach((contributor) => grid.append(contributorCard(contributor)));
}
if (emptyState) emptyState.hidden = contributors.length !== 0;

