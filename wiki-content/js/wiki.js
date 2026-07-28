(function () {
  "use strict";

  var searchIndex = null;
  var searchInput = document.getElementById("wikiSearch");
  var searchResults = document.getElementById("searchResults");

  if (!searchInput || !searchResults) return;

  function getBasePath() {
    var parts = window.location.pathname.split("/");
    var wikiIdx = parts.indexOf("wiki");
    if (wikiIdx >= 0) {
      return "/" + parts.slice(1, wikiIdx + 1).join("/") + "/";
    }
    return "./";
  }

  function getSearchIndexPath() {
    var base = getBasePath();
    return base + "search-index.json";
  }

  function getSnippet(text, query, length) {
    var idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text.slice(0, length);
    var start = Math.max(0, idx - 20);
    var end = Math.min(text.length, start + length);
    return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var re = new RegExp("(" + escaped + ")", "gi");
    return text.replace(re, '<span class="search-result-highlight">$1</span>');
  }

  searchInput.addEventListener("focus", function () {
    if (searchIndex) return;
    fetch(getSearchIndexPath())
      .then(function (r) { return r.json(); })
      .then(function (data) { searchIndex = data; })
      .catch(function () {});
  });

  searchInput.addEventListener("input", function () {
    var query = searchInput.value.trim().toLowerCase();
    if (query.length < 2 || !searchIndex) {
      searchResults.classList.add("hidden");
      return;
    }

    var results = searchIndex
      .map(function (item) {
        var score = 0;
        if (item.title.toLowerCase().indexOf(query) !== -1) score += 10;
        if (item.tags && item.tags.some(function (t) { return t.toLowerCase().indexOf(query) !== -1; })) score += 5;
        if (item.description && item.description.toLowerCase().indexOf(query) !== -1) score += 3;
        if (item.text && item.text.toLowerCase().indexOf(query) !== -1) score += 1;
        return { slug: item.slug, category: item.category, title: item.title, description: item.description, text: item.text, score: score };
      })
      .filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 10);

    if (results.length === 0) {
      searchResults.classList.add("hidden");
      return;
    }

    searchResults.innerHTML = results
      .map(function (item) {
        var snippet = getSnippet(item.text || "", query, 80);
        return '<a href="' + getBasePath() + 'pages/' + item.category + '/' + item.slug + '.html" class="search-result-item">' +
          '<div class="search-result-title">' + highlightMatch(item.title, query) + '</div>' +
          '<div class="search-result-category">' + item.category + '</div>' +
          '<div class="search-result-snippet">' + highlightMatch(snippet, query) + '</div>' +
          '</a>';
      })
      .join("");
    searchResults.classList.remove("hidden");
  });

  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      searchResults.classList.add("hidden");
      searchInput.blur();
    }
  });

  document.addEventListener("click", function (e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add("hidden");
    }
  });

  // Sidebar toggle
  var sidebarToggle = document.getElementById("sidebarToggle");
  var sidebar = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("sidebar--open");
    });
  }

  // Category collapse
  var headers = document.querySelectorAll(".sidebar-category-header");
  for (var i = 0; i < headers.length; i++) {
    headers[i].addEventListener("click", function () {
      this.parentElement.classList.toggle("sidebar-category--active");
    });
  }

  // Image lightbox
  var imgs = document.querySelectorAll(".page-body img");
  for (var j = 0; j < imgs.length; j++) {
    imgs[j].addEventListener("click", function () {
      var overlay = document.createElement("div");
      overlay.className = "lightbox-overlay";
      overlay.innerHTML = '<img src="' + this.src + '" alt="' + (this.alt || "") + '">';
      overlay.addEventListener("click", function () { overlay.remove(); });
      document.body.appendChild(overlay);
    });
  }
})();
