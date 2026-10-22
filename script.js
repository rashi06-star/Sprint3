
const API_URL = "https://api.github.com/users/";

// DOM Elements
const searchForm = document.getElementById("searchForm");
const usernameInput = document.getElementById("username");
const profileSection = document.getElementById("profileSection");
const profileCard = document.getElementById("profileCard");
const repoList = document.getElementById("repoList");
const repoCount = document.getElementById("repoCount");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const welcome = document.getElementById("welcome");

const battleToggle = document.getElementById("battleToggle");
const battlePanel = document.getElementById("battlePanel");
const battleForm = document.getElementById("battleForm");
const battleResults = document.getElementById("battleResults");
const battleCards = document.getElementById("battleCards");
const battleSummary = document.getElementById("battleSummary");

let requestId = 0;

// Format ISO date into a readable date.
function formatDate(dateString) {
  if (!dateString) return "Not available";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

// Create DOM elements safely.
function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== null && text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// Create secure external links.
function createLink(url, text, className = "profile-link") {
  const link = createElement("a", className, text);

  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  return link;
}

// Fetch JSON data and handle HTTP errors.
async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "User Not Found! Please check the GitHub username."
      );
    }

    if (response.status === 403 || response.status === 429) {
      throw new Error(
        "GitHub API rate limit exceeded. Please try again later."
      );
    }

    throw new Error(
      `Request failed with status ${response.status}.`
    );
  }

  return response.json();
}

// Fetch a GitHub profile and all its public repositories.
async function getDeveloper(username) {
  const cleanUsername = username.trim();

  if (!cleanUsername) {
    throw new Error("Please enter a GitHub username.");
  }

  // First API request: Get user profile.
  const user = await fetchJSON(
    API_URL + encodeURIComponent(cleanUsername)
  );

  // Second API request onwards: Fetch repositories in pages.
  const repositories = [];
  let page = 1;

  while (true) {
    const repoURL =
      `${user.repos_url}?per_page=100&page=${page}`;

    const pageData = await fetchJSON(repoURL);

    repositories.push(...pageData);

    if (pageData.length < 100) {
      break;
    }

    page++;
  }

  // Sort repositories by most recently updated.
  repositories.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() -
      new Date(a.updated_at).getTime()
  );

  // Calculate total stars across public repositories.
  const totalStars = repositories.reduce(
    (total, repo) => total + repo.stargazers_count,
    0
  );

  return {
    user,
    repositories,
    totalStars
  };
}

// Build the main GitHub profile card.
function buildProfileCard(user) {
  const card = createElement("article", "profile-card");
  const top = createElement("div", "profile-top");

  const avatar = createElement("img", "avatar");
  avatar.src = user.avatar_url;
  avatar.alt = `${user.login}'s GitHub avatar`;
  avatar.loading = "lazy";

  const info = createElement("div", "profile-info");

  info.appendChild(
    createElement("h3", "", user.name || user.login)
  );

  info.appendChild(
    createLink(
      user.html_url,
      `@${user.login}`,
      "username-link"
    )
  );

  info.appendChild(
    createElement(
      "p",
      "profile-bio",
      user.bio || "This developer hasn't added a bio yet."
    )
  );

  top.append(avatar, info);
  card.appendChild(top);

  // Profile statistics.
  const stats = createElement("div", "profile-stats");

  const statData = [
    ["Followers", user.followers],
    ["Following", user.following],
    ["Public Repos", user.public_repos]
  ];

  statData.forEach(([label, value]) => {
    const stat = createElement("div", "stat");

    stat.appendChild(
      createElement("span", "stat-label", label)
    );

    stat.appendChild(
      createElement("span", "stat-value", value)
    );

    stats.appendChild(stat);
  });

  card.appendChild(stats);

  // Join date, portfolio and location.
  const links = createElement("div", "profile-links");

  links.appendChild(
    createElement(
      "span",
      "profile-link",
      `Joined ${formatDate(user.created_at)}`
    )
  );

  if (user.blog) {
    let portfolioURL = user.blog.trim();

    if (!/^https?:\/\//i.test(portfolioURL)) {
      portfolioURL = `https://${portfolioURL}`;
    }

    try {
      const parsedURL = new URL(portfolioURL);

      if (
        parsedURL.protocol === "https:" ||
        parsedURL.protocol === "http:"
      ) {
        links.appendChild(
          createLink(parsedURL.href, "↗ Portfolio")
        );
      }
    } catch {
      // Ignore invalid portfolio URLs.
    }
  }

  if (user.location) {
    links.appendChild(
      createElement(
        "span",
        "profile-link",
        `⌖ ${user.location}`
      )
    );
  }

  card.appendChild(links);

  return card;
}

// Render the five latest updated repositories.
function renderRepositories(repositories) {
  repoList.replaceChildren();

  const latestFive = repositories.slice(0, 5);

  repoCount.textContent = `${latestFive.length} shown`;

  if (latestFive.length === 0) {
    repoList.appendChild(
      createElement(
        "div",
        "empty-state",
        "No public repositories found for this developer."
      )
    );

    return;
  }

  latestFive.forEach((repo) => {
    const card = createElement("article", "repo-card");

    card.appendChild(
      createLink(
        repo.html_url,
        repo.name,
        "repo-name"
      )
    );

    card.appendChild(
      createElement(
        "p",
        "repo-description",
        repo.description || "No description provided."
      )
    );

    const meta = createElement("div", "repo-meta");

    if (repo.language) {
      meta.appendChild(
        createElement(
          "span",
          "repo-language",
          `● ${repo.language}`
        )
      );
    }

    meta.appendChild(
      createElement(
        "span",
        "",
        `★ ${repo.stargazers_count}`
      )
    );

    meta.appendChild(
      createElement(
        "span",
        "",
        `⑂ ${repo.forks_count}`
      )
    );

    meta.appendChild(
      createElement(
        "span",
        "",
        `Updated ${formatDate(repo.updated_at)}`
      )
    );

    card.appendChild(meta);
    repoList.appendChild(card);
  });
}

// Reset the interface before a new search.
function resetUI() {
  profileSection.classList.add("hidden");
  battleResults.classList.add("hidden");
  errorMessage.classList.add("hidden");
  loading.classList.add("hidden");
  welcome.classList.add("hidden");
}

// Display an error message.
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

// Display the loading indicator.
function showLoading() {
  resetUI();
  loading.classList.remove("hidden");
}

// Hide the loading indicator.
function hideLoading() {
  loading.classList.add("hidden");
}

// Phase 1 and Phase 2: Search one developer.
async function searchDeveloper(username) {
  const currentRequest = ++requestId;

  if (!username.trim()) {
    resetUI();
    welcome.classList.remove("hidden");
    showError("Please enter a GitHub username.");
    return;
  }

  showLoading();

  try {
    const result = await getDeveloper(username);

    // Prevent older requests from overwriting newer results.
    if (currentRequest !== requestId) return;

    profileCard.replaceChildren(
      buildProfileCard(result.user)
    );

    renderRepositories(result.repositories);

    profileSection.classList.remove("hidden");
  } catch (error) {
    if (currentRequest !== requestId) return;

    showError(
      error.message ||
      "Something went wrong. Please try again."
    );
  } finally {
    if (currentRequest === requestId) {
      hideLoading();
    }
  }
}

// Handle the main search form.
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  searchDeveloper(usernameInput.value);
});

// Quick search for the sample username.
document
  .querySelector(".sample-user")
  .addEventListener("click", () => {
    usernameInput.value = "octocat";
    searchForm.requestSubmit();
  });

// Toggle Battle Mode.
battleToggle.addEventListener("click", () => {
  const opening = battlePanel.classList.contains("hidden");

  battlePanel.classList.toggle("hidden");
  battleToggle.classList.toggle("active", opening);

  if (opening) {
    document.getElementById("usernameOne").focus();
  }
});

// Create a card for Battle Mode.
function createBattleCard(developer, result) {
  const { user, totalStars } = developer;

  const card = createElement(
    "article",
    `battle-card ${result}`
  );

  const avatar = createElement("img", "avatar");

  avatar.src = user.avatar_url;
  avatar.alt = `${user.login}'s avatar`;
  avatar.loading = "lazy";

  card.appendChild(avatar);

  card.appendChild(
    createElement(
      "h3",
      "",
      user.name || user.login
    )
  );

  card.appendChild(
    createLink(
      user.html_url,
      `@${user.login}`,
      "username-link"
    )
  );

  card.appendChild(
    createElement(
      "p",
      "stars",
      `★ ${totalStars.toLocaleString("en-US")}`
    )
  );

  card.appendChild(
    createElement(
      "p",
      "",
      "Total repository stars"
    )
  );

  let label = "🤝 TIE";

  if (result === "winner") {
    label = "🏆 WINNER";
  } else if (result === "loser") {
    label = "RUNNER-UP";
  }

  card.appendChild(
    createElement(
      "p",
      result === "winner" ? "winner-label" : "",
      label
    )
  );

  return card;
}

// Phase 3: Compare two GitHub developers.
battleForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userOne = document
    .getElementById("usernameOne")
    .value.trim();

  const userTwo = document
    .getElementById("usernameTwo")
    .value.trim();

  if (!userOne || !userTwo) {
    resetUI();
    showError("Please enter both GitHub usernames.");
    return;
  }

  if (userOne.toLowerCase() === userTwo.toLowerCase()) {
    resetUI();
    showError(
      "Please enter two different usernames to compare."
    );
    return;
  }

  const currentRequest = ++requestId;

  showLoading();

  try {
    // Fetch both developers concurrently.
    const [developerOne, developerTwo] =
      await Promise.all([
        getDeveloper(userOne),
        getDeveloper(userTwo)
      ]);

    if (currentRequest !== requestId) return;

    const firstWins =
      developerOne.totalStars > developerTwo.totalStars;

    const secondWins =
      developerTwo.totalStars > developerOne.totalStars;

    const firstResult = firstWins
      ? "winner"
      : secondWins
        ? "loser"
        : "tie";

    const secondResult = secondWins
      ? "winner"
      : firstWins
        ? "loser"
        : "tie";

    battleCards.replaceChildren(
      createBattleCard(developerOne, firstResult),
      createBattleCard(developerTwo, secondResult)
    );

    if (firstWins) {
      battleSummary.textContent =
        `${developerOne.user.login} wins with ` +
        `${developerOne.totalStars.toLocaleString("en-US")} stars!`;
    } else if (secondWins) {
      battleSummary.textContent =
        `${developerTwo.user.login} wins with ` +
        `${developerTwo.totalStars.toLocaleString("en-US")} stars!`;
    } else {
      battleSummary.textContent =
        `It's a tie! Both developers have ` +
        `${developerOne.totalStars.toLocaleString("en-US")} total stars.`;
    }

    battleResults.classList.remove("hidden");
  } catch (error) {
    if (currentRequest !== requestId) return;

    showError(
      error.message ||
      "Unable to compare these developers."
    );
  } finally {
    if (currentRequest === requestId) {
      hideLoading();
    }
  }
});
