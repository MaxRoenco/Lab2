module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });

  eleventyConfig.addCollection("home", function (collectionApi) {
    return collectionApi.getFilteredByTag("home");
  });

  eleventyConfig.addCollection("courses", function (collectionApi) {
    return collectionApi
      .getFilteredByTag("course")
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
  });

  eleventyConfig.addCollection("testimonials", function (collectionApi) {
    return collectionApi
      .getFilteredByTag("testimonial")
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
  });

  eleventyConfig.addCollection("galleryItems", function (collectionApi) {
    return collectionApi
      .getFilteredByTag("galleryItem")
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
