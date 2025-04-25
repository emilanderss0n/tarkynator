import { fetchData } from './cache.js';

document.addEventListener('DOMContentLoaded', () => {

    const achievementsContainer = document.getElementById('achievementsContainer');
    const achievementsContent = document.getElementById('achievementsContent');

    const fetchAchievementsData = () => {
        const query = `
            query {
                achievements {
                    id
                    name
                    description
                    rarity
                    hidden
                }
            }
        `;

        const url = 'https://api.tarkov.dev/graphql';
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip'
            },
            body: JSON.stringify({ query })
        };

        fetchData(url, options)
            .then(data => {
                if (data && data.data && data.data.achievements) {
                    // Store the achievements data in localStorage
                    localStorage.setItem('achievementsData', JSON.stringify(data.data.achievements));

                    // Fetch the achievements.json file
                    fetch('data/achievements.json')
                        .then(response => response.json())
                        .then(jsonData => {
                            const achievementsHTML = data.data.achievements.map(achievement => {
                                let imageUrl = '';
                                if (achievement.id === '676091c0f457869a94017a23') {
                                    imageUrl = '675864eb86778bc82004127c.png';
                                } else if (achievement.id === '676094451fec2f7426093be6') {
                                    imageUrl = '675864efbe287595450c7686.png';
                                } else {
                                    const achievementData = jsonData.find(item => item.id === achievement.id);
                                    imageUrl = achievementData ? achievementData.imageUrl : '';
                                }
                                const imgSrc = imageUrl 
                                ? `${window.location.origin}/tarkynator/assets/img/achievements/${imageUrl.split('/').pop()}`
                                : `${window.location.origin}/tarkynator/assets/img/achievements/Standard_14.png`;

                                return `
                                    <div class="achievements-item card ${achievement.hidden ? 'ach-hidden' : ''} ${achievement.rarity.toLowerCase()}">
                                        <img src="${imgSrc}" alt="${achievement.name}">
                                        <div class="content">
                                            <h4>${achievement.name}</h4>
                                            <p>${achievement.description}</p>
                                            <span class="global-id">${achievement.id}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                            achievementsContent.innerHTML = achievementsHTML;
                        })
                        .catch(error => {
                            console.error('Error fetching achievements.json:', error);
                            achievementsContent.innerHTML = 'Error fetching achievements data.';
                        });
                } else {
                    achievementsContent.innerHTML = 'No achievements data found.';
                }
            })
            .catch(error => {
                console.error('Error fetching achievements data:', error);
                achievementsContent.innerHTML = 'Error fetching achievements data.';
            });
    };


    fetchAchievementsData();

});