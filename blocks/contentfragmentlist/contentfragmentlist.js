/**
 * Updates url to contain a query parameter to prevent caching
 * @param {string} url
 * @returns url with cache killer query parameter
 */
function addCacheKiller(url) {
  const newUrl = new URL(url);
  const params = newUrl.searchParams;
  params.append('ck', Date.now());
  return newUrl.toString();
}

function isInUniversalEditor() {
  return window.location.ancestorOrigins?.length > 0;
}

function getImageURL(image) {
  // eslint-disable-next-line no-underscore-dangle
  const publishHost = new URL(image._publishUrl).hostname;
  // eslint-disable-next-line no-underscore-dangle
  return isInUniversalEditor() && publishHost ? image._authorUrl : `https://${publishHost}${image._dynamicUrl}`;
}

async function getItems(query, amount) {
  const url = addCacheKiller(query);
  const json = await fetch(url, {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-cache',
    referrerPolicy: 'origin-when-cross-origin',
    credentials: 'include',
  }).then((response) => response.json());
  const items = json?.data?.adventureList?.items.slice(0, amount) || [];

  return items.map((item) => ({
    // eslint-disable-next-line no-underscore-dangle
    _path: item._path,
    title: item.title,
    price: item.price,
    tripLength: item.tripLength,
    image: {
      deliveryUrl: getImageURL(item.primaryImage),
      mimeType: item.primaryImage.mimeType,
      width: item.primaryImage.width,
      height: item.primaryImage.height,
    },
  }));
}

function useAuthorQuery(query) {
  return query.replace('//publish-', '//author-');
}

export default async function decorate(block) {
  const query = isInUniversalEditor() ? useAuthorQuery(block.textContent) : block.textContent;
  const items = await getItems(query, 6);

  const root = document.createElement('ul');
  root.setAttribute('class', 'cf-list');

  items.forEach((item) => {
    const element = document.createElement('li');
    element.setAttribute('class', 'cf-item');
    element.setAttribute('itemscope', '');
    // eslint-disable-next-line no-underscore-dangle
    element.setAttribute('itemid', `urn:aemconnection:${item._path}/jcr:content/data/master`);
    element.setAttribute('itemtype', 'reference');
    element.innerHTML = `
        <div class="cf-item-wrapper">
          <div class="cf-item__overlay"></div>
          <picture class="cf-item__image">
            <source type="image/webp" srcset="${item.image.deliveryUrl}?preferweb=true" media="(min-width: 600px)">
            <source type="image/webp" srcset="${item.image.deliveryUrl}?preferweb=true&width=750">
            <source type="${item.image.mimeType}" srcset="${item.image.deliveryUrl}" media="(min-width: 600px)">
            <img src="${item.image.url}" width="${item.image.width}" height="${item.image.height}" alt="${item.title}" type="${item.image.mimeType}" itemprop="primaryImage" itemtype="image" loading="lazy">
          </picture>
          <div class="cf-item-wrapper__inner">
            <div class="cf-item__title" itemprop="title" itemtype="text">${item.title}</div>
            <div class="cf-item__details">
              <p class="cf-item__length" itemprop="tripLength" itemtype="text" >${item.tripLength}</p>
              <p class="cf-item__price" itemprop="price" itemtype="text">${item.price}</p>
            </div>
          </div>
        </div>
    `;
    root.appendChild(element);
  });

  block.textContent = '';
  block.append(root);
}
