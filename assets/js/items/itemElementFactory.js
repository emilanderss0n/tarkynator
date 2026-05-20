export function createItemListElement(item) {
    const listItem = document.createElement("li");
    listItem.className = "list-group-item";

    const iconLink = item.iconLink.replace(
        /^.*\/data\/icons\//,
        "data/icons/"
    );

    listItem.innerHTML = `
        <img src="${iconLink}" alt="${item.name}" class="small-glow" style="width: 50px; height: 50px; margin-right: 10px;">
        ${item.name}
    `;

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
