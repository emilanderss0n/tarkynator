import { createManagedImage } from "../core/imageManager.js";

export function createItemListElement(item) {
    const listItem = document.createElement("li");
    listItem.className = "list-group-item";

    const iconLink = item.iconLink.replace(
        /^.*\/data\/icons\//,
        "data/icons/"
    );

    const image = createManagedImage({
        src: iconLink,
        alt: item.name,
        className: "small-glow",
        width: 50,
        height: 50,
        fallbackSrc: "assets/img/icon_quest.png",
    });

    image.style.marginRight = "10px";

    listItem.appendChild(image);
    listItem.append(document.createTextNode(item.name));

    const handbookCategoriesNames = item.handbookCategories
        .map((category) => category.name)
        .join(", ");
    const taskIds = item.usedInTasks
        ? item.usedInTasks.map((task) => task.id).join(",")
        : "";

    Object.assign(listItem.dataset, {
        itemId: item.id,
        itemTypes: handbookCategoriesNames,
        usedInTasks: taskIds,
    });

    return listItem;
}
