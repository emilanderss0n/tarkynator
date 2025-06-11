/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/brace-style */

/*
* If you are reading this, I hope you are enjoying Scorpion
* 
* 
* I have worked on this mod for several months and have tried my best to make it as easy to read and clean as possible
* I may not always do things in the best way, but I do try!
* If you have any questions please reach out to me in the SPT Discord - do not DM me
*  
*/
import { DependencyContainer, container } from "tsyringe";

// SPT types
import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { PreSptModLoader } from "@spt/loaders/PreSptModLoader";
import { DatabaseService } from "@spt/services/DatabaseService";
import { ImageRouter } from "@spt/routers/ImageRouter";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { ITraderConfig } from "@spt/models/spt/config/ITraderConfig";
import { IRagfairConfig } from "@spt/models/spt/config/IRagfairConfig";
import type {DynamicRouterModService} from "@spt/services/mod/dynamicRouter/DynamicRouterModService";
import { RandomUtil } from "@spt/utils/RandomUtil";

// JSON Imports
import { JsonUtil } from "@spt/utils/JsonUtil";
import { FileSystemSync } from "@spt/utils/FileSystemSync";
import { jsonc } from "jsonc";
import fs from "node:fs";
import path from "node:path";


// Custom Imports
import { TraderHelper } from "./traderHelpers";
import { Traders } from "@spt/models/enums/Traders";
import baseJson = require("../db/base.json");
import questJson = require("../db/questassort.json");
import assortJson = require("../db/assort.json");
import productionJson = require("../db/production.json");
import weaponCompatibility = require("../config/ModdedWeaponCompatibility.json");
import scorpionQuests = require("../../Virtual's Custom Quest Loader/database/quests/Scorpion_quests.json");
import { RagfairOfferGenerator } from "@spt/generators/RagfairOfferGenerator";

let realismDetected: boolean;
const loadMessage = {
    0: "Scorpion has brought his crew into Tarkov",
    1: "One of us..one of us..one of us",
    2: "Welcome to the team, you're one of us meow ♡",
    3: "Call Kenny Loggins because you're in the danger zone",
    4: "Can I offer you a nice egg in this trying time?",
    5: "Good news everyone! We have over 100 quests!",
    6: "Never half-ass two things. Whole-ass one thing.",
    7: "Thanks for signing up for Cat Facts! You will now receive fun daily facts about CATS!",
    8: "Thanks for signing up for Dog Facts! You will now receive fun daily facts about DOGS!",
    9: "A big ball of wibbly wobbly, timey wimey stuff",
    10: "(╯°□°)╯︵ ┻━┻ ",
    11: "┬─┬ノ( º _ ºノ)",
    12: "Treat others how you want to be treated",
    13: "No act of kindness, no matter how small, is ever wasted",
    14: "Reticulating Splines...",
    15: "Unfolding Foldy Chairs...",
    16: "Pressurizing Fruit Punch Barrel Hydraulics...",
    17: "Fabricating Imaginary Infrastructure...",
    18: "We apologize again for the fault in the subtitles. Those responsible for sacking the people who have just been sacked, have been sacked.",
    19: "Are you suggesting coconuts migrate?",
    20: "We are now the knights who say ekki-ekki-ekki-pitang-zoom-boing!",
    21: "Knight jumps queen! Bishop jumps queen! Pawns jump queen!",
    22: "Hello. My name is Inigo Montoya. You killed my father. Prepare to die.",
    23: "I spent the last few years building up an immunity to iocane powder.",
    24: "Rodents Of Unusual Size? I don't think they exist.",
    25: "Always try to be nice, but never fail to be kind",
    26: "Never be cruel, never be cowardly",
    27: "Who do I need to ban? (◣_◢)",
    28: "This loading message is sponsored by Raid: Shadow Legends"
}

class Scorpion implements IPreSptLoadMod, IPostDBLoadMod
{
    private mod: string
    private logger: ILogger
    private traderHelper: TraderHelper 

    private static fileSystemSync = container.resolve<FileSystemSync>("FileSystemSync");    
    private static config: Config = jsonc.parse(Scorpion.fileSystemSync.read(path.resolve(__dirname, "../config/config.jsonc")));

    // Set the name of mod for logging purposes
    constructor() 
    {
        this.mod = "acidphantasm-scorpion"; 
    }

    /*
     * Some work needs to be done prior to SPT code being loaded
     * 
     * TLDR:
     * Resolve SPT Types
     * Set trader refresh, config, image, flea settings
     * Register Dynamic Router for Randomization Config
     * 
     */
    public preSptLoad(container: DependencyContainer): void
    {
        // Get a logger
        this.logger = container.resolve<ILogger>("WinstonLogger");

        // Get SPT code/data we need later
        const dynamicRouterModService = container.resolve<DynamicRouterModService>("DynamicRouterModService");     
        const preSptModLoader: PreSptModLoader = container.resolve<PreSptModLoader>("PreSptModLoader");   
        const databaseService: DatabaseService = container.resolve<DatabaseService>("DatabaseService");
        const ragfairOfferGenerator = container.resolve<RagfairOfferGenerator>("RagfairOfferGenerator");
        const imageRouter: ImageRouter = container.resolve<ImageRouter>("ImageRouter");
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const traderConfig: ITraderConfig = configServer.getConfig<ITraderConfig>(ConfigTypes.TRADER);
        const ragfairConfig = configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);
        
        // Set config values to local variables for validation & use
        let minRefresh = Scorpion.config.traderRefreshMin;
        let maxRefresh = Scorpion.config.traderRefreshMax;
        const addToFlea = Scorpion.config.addTraderToFlea;
        if (minRefresh >= maxRefresh || maxRefresh <= 2)
        {
            minRefresh = 1800;
            maxRefresh = 3600;
            this.logger.error(`[${this.mod}] [Config Issue] Refresh timers have been reset to default.`);
        }
        
        // Create helper class and use it to register our traders image/icon + set its stock refresh time
        this.traderHelper = new TraderHelper();
        const currentDate = new Date();
        const month = currentDate.getMonth();
        const day = currentDate.getDate();
        if (month == 3 && day == 1) 
        {
            baseJson.nickname = "ScorpionXYZ"
            baseJson.name = "ScorpionXYZ"
            baseJson.avatar = "/files/trader/avatar/6688d464bc40c867f60e7d7e_aprilfools.jpg"
            this.traderHelper.registerProfileImage(baseJson, this.mod, preSptModLoader, imageRouter, "6688d464bc40c867f60e7d7e_aprilfools.jpg");
        }
        else this.traderHelper.registerProfileImage(baseJson, this.mod, preSptModLoader, imageRouter, "6688d464bc40c867f60e7d7e.jpg");
        
        this.traderHelper.setTraderUpdateTime(traderConfig, baseJson, minRefresh, maxRefresh);

        // Add trader to trader enum
        Traders[baseJson._id] = baseJson._id;

        // Add trader to flea market
        if (addToFlea)
        {
            ragfairConfig.traders[baseJson._id] = true;
        }
        else
        {
            ragfairConfig.traders[baseJson._id] = false;
        }

        dynamicRouterModService.registerDynamicRouter(
            "ScorpionRefreshStock",
            [
                {
                    url: "/client/items/prices/6688d464bc40c867f60e7d7e",
                    action: async (url, info, sessionId, output) =>
                    {
                        const trader = databaseService.getTables().traders["6688d464bc40c867f60e7d7e"];
                        const assortItems = trader.assort.items;
                        let updateFleaOffers = false;
                        if (!realismDetected)
                        {
                            if (Scorpion.config.randomizeBuyRestriction)
                            {
                                if (Scorpion.config.debugLogging) {this.logger.info(`[${this.mod}] Refreshing Scorpion Stock with Randomized Buy Restrictions.`);}
                                updateFleaOffers = true;
                                this.randomizeBuyRestriction(assortItems);
                            }
                            if (Scorpion.config.randomizeStockAvailable)
                            {
                                if (Scorpion.config.debugLogging) {this.logger.info(`[${this.mod}] Refreshing Scorpion Stock with Randomized Stock Availability.`);}
                                updateFleaOffers = true;
                                this.randomizeStockAvailable(assortItems);
                            }

                            if (updateFleaOffers) ragfairOfferGenerator.generateFleaOffersForTrader("6688d464bc40c867f60e7d7e");
                        }
                        return output;
                    }
                }
            ],
            "spt"
        );
    }
    /*
     * Some work needs to be done after loading SPT code
     * 
     * TLDR:
     * Resolve SPT Types
     * Add Modded Weapons to Quests
     * Mod Detection to enable/disable Assort Configuration options
     * Apply Assort Configurations
     * Add trader to dictionary, locales, and assort
     * 
     */
    public postDBLoad(container: DependencyContainer): void
    {
        const start = performance.now();

        // Resolve SPT classes we'll use
        const databaseService: DatabaseService = container.resolve<DatabaseService>("DatabaseService");
        const jsonUtil: JsonUtil = container.resolve<JsonUtil>("JsonUtil");
        const logger = container.resolve<ILogger>("WinstonLogger");
        const quests = databaseService.getTables().templates.quests;


        //Set local variables for assortJson
        const assortPriceTable = assortJson.barter_scheme;
        const assortItemTable = assortJson.items;
        const assortLoyaltyTable = assortJson.loyal_level_items;
        
        //Run Modded Weapon Compatibility
        this.moddedWeaponCompatibility();

        //Enable event quests
        if (Scorpion.config.eventQuestsAlwaysActive) { this.eventQuestsAlwaysActive(quests,scorpionQuests);}

        //Check Mod Compatibility
        this.modDetection();

        //Push Production Schemes
        this.pushProductionUnlocks();

        //Update Assort
        if (Scorpion.config.priceMultiplier !== 1) {this.setPriceMultiplier(assortPriceTable);}
        if (Scorpion.config.randomizeBuyRestriction) {this.randomizeBuyRestriction(assortItemTable);}
        if (Scorpion.config.randomizeStockAvailable) {this.randomizeStockAvailable(assortItemTable);}
        if (Scorpion.config.unlimitedStock) {this.setUnlimitedStock(assortItemTable);}
        if (Scorpion.config.unlimitedBuyRestriction) {this.setUnlimitedBuyRestriction(assortItemTable);}
        if (Scorpion.config.removeLoyaltyRestriction) {this.disableLoyaltyRestrictions(assortLoyaltyTable);}

        // Set local variable for assort to pass to traderHelper regardless of priceMultiplier config
        const newAssort = assortJson

        // Get a reference to the database tables
        const tables = databaseService.getTables();

        // Add new trader to the trader dictionary in DatabaseServer       
        // Add quest assort
        // Add trader to locale file, ensures trader text shows properly on screen
        this.traderHelper.addTraderToDb(baseJson, tables, jsonUtil, newAssort);
        tables.traders[baseJson._id].questassort = questJson;
        this.traderHelper.addTraderToLocales(baseJson, tables, baseJson.name, baseJson._id, baseJson.nickname, baseJson.location, "I'm sellin', what are you buyin'?");

        this.logger.debug(`[${this.mod}] loaded... `);

        const timeTaken = performance.now() - start;
        if (Scorpion.config.debugLogging) {logger.log(`[${this.mod}] Trader load took ${timeTaken.toFixed(3)}ms.`, "cyan");}

        logger.log(`[${this.mod}] ${this.getRandomLoadMessage()}`, "cyan");
    }

    /*
     * 
     * All functions are below this comment
     * 
     * Most of these functions should be self explanatory
     * 
     */
    private setRealismDetection(i: boolean) // Except this one. This is dumb. I'll fix it eventually.
    {
        realismDetected = i;
        if (realismDetected && Scorpion.config.randomizeBuyRestriction || realismDetected && Scorpion.config.randomizeStockAvailable)
        {
            this.logger.log(`[${this.mod}] SPT-Realism detected, disabling randomizeBuyRestriction and/or randomizeStockAvailable:`, "cyan");
        }
    }

    private setPriceMultiplier (assortPriceTable)
    {
        let priceMultiplier = Scorpion.config.priceMultiplier;
        if (priceMultiplier <= 0) 
        {
            priceMultiplier = 1;
            this.logger.error(`[${this.mod}] priceMultiplier cannot be set to zero.`)
        }
        for (const itemID in assortPriceTable)
        {
            for (const item of assortPriceTable[itemID])
            {
                if (item[0].count <= 15)
                {
                    if (Scorpion.config.debugLogging) {this.logger.log(`[${this.mod}] itemID: [${itemID}] No price change, it's a barter trade.`, "cyan");}
                    continue;
                }
                const count = item[0].count;
                const newPrice = Math.round(count * priceMultiplier);
                item[0].count = newPrice
                if (Scorpion.config.debugLogging) {this.logger.log(`[${this.mod}] itemID: [${itemID}] Price Changed to: [${newPrice}]`, "cyan");}
            }
        } 
    }

    private randomizeBuyRestriction(assortItemTable)
    {
        const randomUtil: RandomUtil = container.resolve<RandomUtil>("RandomUtil");
        if (!realismDetected) // If realism is not detected, continue, else do nothing
        {
            for (const item in assortItemTable)
            {
                if (assortItemTable[item].parentId !== "hideout" || assortItemTable[item].upd.BuyRestrictionMax <= 3)
                {
                    continue // Skip setting count, it's a weapon attachment or armour plate
                }
                const itemID = assortItemTable[item]._id;
                const oldRestriction = assortItemTable[item].upd.BuyRestrictionMax;
                const newRestriction = randomUtil.randInt(4, oldRestriction + 40);
                
                assortItemTable[item].upd.BuyRestrictionMax = newRestriction;
    
                if (Scorpion.config.debugLogging) {this.logger.log(`[${this.mod}] Item: [${itemID}] Buy Restriction Changed to: [${newRestriction}]`, "cyan");}
            }
        }
    }

    private randomizeStockAvailable(assortItemTable)
    {
        const randomUtil: RandomUtil = container.resolve<RandomUtil>("RandomUtil");
        if (!realismDetected) // If realism is not detected, continue, else do nothing
        {
            for (const item in assortItemTable)
            {
                if (assortItemTable[item].parentId !== "hideout")
                {
                    continue // Skip setting count, it's a weapon attachment or armour plate
                }
                const outOfStockRoll = randomUtil.getChance100(Scorpion.config.outOfStockChance);
                
                if (outOfStockRoll)
                {
                    const itemID = assortItemTable[item]._id;
                    assortItemTable[item].upd.StackObjectsCount = 0;

                    if (Scorpion.config.debugLogging) {this.logger.log(`[${this.mod}] Item: [${itemID}] Marked out of stock`, "cyan");}
                } 
                else
                {
                    if (assortItemTable[item].upd.StackObjectsCount <= 10) assortItemTable[item].upd.StackObjectsCount = 250

                    const itemID = assortItemTable[item]._id;
                    const originalStock = assortItemTable[item].upd.StackObjectsCount;
                    const newStock = randomUtil.randInt(3, Math.round(originalStock*0.75));

                    if (Scorpion.config.debugLogging) {this.logger.log(`[${this.mod}] Item: [${itemID}] Original Count: ${originalStock} | Stock Count changed to: [${newStock}]`, "cyan");}

                    assortItemTable[item].upd.StackObjectsCount = newStock;
                }
            }
        }
    }

    private setUnlimitedStock(assortItemTable)
    {
        for (const item in assortItemTable)
        {
            if (assortItemTable[item].parentId !== "hideout")
            {
                continue // Skip setting count, it's a weapon attachment or armour plate
            }
            assortItemTable[item].upd.StackObjectsCount = 9999999;
            assortItemTable[item].upd.UnlimitedCount = true;
        }
        if (Scorpion.config.debugLogging) {this.logger.log(`[${this.mod}] Item stock counts are now unlimited`, "cyan");}
    }

    private setUnlimitedBuyRestriction(assortItemTable)
    {
        for (const item in assortItemTable)
        {
            if (assortItemTable[item].parentId !== "hideout")
            {
                continue // Skip setting count, it's a weapon attachment or armour plate
            }
            delete assortItemTable[item].upd.BuyRestrictionMax;
            delete assortItemTable[item].upd.BuyRestrictionCurrent;
        }
        if (Scorpion.config.debugLogging) {this.logger.log(`[${this.mod}] Item buy restrictions are now unlimited`, "cyan");}
    }

    private disableLoyaltyRestrictions(assortLoyaltyTable)
    {
        for (const item in assortLoyaltyTable)
        {
            delete assortLoyaltyTable[item];
        }
        if (Scorpion.config.debugLogging) {this.logger.log(`[${this.mod}] All Loyalty Level requirements are removed`, "cyan");}
    }

    private modDetection()
    {
        const preSptModLoader: PreSptModLoader = container.resolve<PreSptModLoader>("PreSptModLoader");
        const vcqlCheck = preSptModLoader.getImportedModsNames().includes("Virtual's Custom Quest Loader");
        const realismCheck = preSptModLoader.getImportedModsNames().includes("SPT-Realism");
        const vcqlDllPath = path.resolve(__dirname, "../../../../BepInEx/plugins/VCQLQuestZones.dll");
        const heliCrashSamSWAT = path.resolve(__dirname, "../../../../BepInEx/plugins/SamSWAT.HeliCrash/SamSWAT.HeliCrash.dll");
        const heliCrashTyrian = path.resolve(__dirname, "../../../../BepInEx/plugins/SamSWAT.HeliCrash.TyrianReboot/SamSWAT.HeliCrash.TyrianReboot.dll");
        const heliCrashArys = path.resolve(__dirname, "../../../../BepInEx/plugins/SamSWAT.HeliCrash.ArysReloaded/SamSWAT.HeliCrash.ArysReloaded.dll");
        
        // VCQL Zones DLL is missing
        if (!fs.existsSync(vcqlDllPath))
        {
            this.logger.error(`[${this.mod}] VCQL Zones DLL missing. Custom Trader quests may not work properly.`);
        }

        // Outdated HeliCrash is installed
        if (fs.existsSync(heliCrashSamSWAT) || fs.existsSync(heliCrashTyrian))
        {
            this.logger.error(`[${this.mod}] Outdated HeliCrash Mod Detected. You will experience issues with Custom Trader quest zones.`);
        }

        // Arys HeliCrash is installed
        if (fs.existsSync(heliCrashArys))
        {
            this.logger.warning(`[${this.mod}] HeliCrash Mod Detected. You may experience issues with Custom Trader quest zones.`);
        }

        // VCQL package.json is missing
        if (!vcqlCheck)
        {
            this.logger.error(`[${this.mod}] VCQL not detected. Install VCQL and re-install ${this.mod}.`);
        }

        // This is completely unneccessary and I'll fix it, eventually - probably
        if (Scorpion.config.randomizeBuyRestriction || Scorpion.config.randomizeStockAvailable)
        {
            this.setRealismDetection(realismCheck);
        }
        else
        {
            this.setRealismDetection(realismCheck);
        }
    }

    private moddedWeaponCompatibility()
    {
        const databaseService: DatabaseService = container.resolve<DatabaseService>("DatabaseService");
        const questTable = databaseService.getTables().templates.quests;
        const quests = Object.values(questTable);

        let questType;
        let weaponType;
        let wasAdded:boolean;

        if (weaponCompatibility.AssaultRifles.length >= 1)
        {
            weaponType = weaponCompatibility.AssaultRifles;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - ARs"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.SubmachineGuns.length >= 1)
        {
            weaponType = weaponCompatibility.SubmachineGuns;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - SMGs"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.Snipers.length >= 1)
        {
            weaponType = weaponCompatibility.Snipers;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - Snipers"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.Marksman.length >= 1)
        {
            weaponType = weaponCompatibility.Marksman;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - Marksman"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.Shotguns.length >= 1)
        {
            weaponType = weaponCompatibility.Shotguns;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - Shotguns"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.Pistols.length >= 1)
        {
            weaponType = weaponCompatibility.Pistols;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - Pistols"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.LargeMachineGuns.length >= 1)
        {
            weaponType = weaponCompatibility.LargeMachineGuns;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - LMGs"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.Carbines.length >= 1)
        {
            weaponType = weaponCompatibility.Carbines;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - Carbines"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.Melee.length >= 1)
        {
            weaponType = weaponCompatibility.Melee;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - Melee"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (weaponCompatibility.Explosives.length >= 1)
        {
            weaponType = weaponCompatibility.Explosives;
            questType = quests.filter(x => x.QuestName.includes("Weapon Proficiency - Explosives"));
            wasAdded = true;
            this.moddedWeaponPushToArray(questType, weaponType);
        }
        if (wasAdded) { this.logger.log(`[${this.mod}] Custom Weapons added to proficiency quests. Enjoy!`, "cyan"); }
    }
    
    private moddedWeaponPushToArray(questTable, weaponType)
    {        
        for (const quest in questTable)
        {
            for (const condition in questTable[quest].conditions.AvailableForFinish)
            {
                for (const item in questTable[quest].conditions.AvailableForFinish[condition].counter.conditions)
                {
                    for (const id of weaponType)
                    {
                        questTable[quest].conditions.AvailableForFinish[condition].counter.conditions[item].weapon.push(id);
                    }
                }
            }
            if (Scorpion.config.debugLogging) { this.logger.log(`[${this.mod}] ${questTable[quest].QuestName} --- Added ${weaponType}`, "cyan"); }
        }
    }
    
    private eventQuestsAlwaysActive(questTable, quests)
    {
        let eventCount = 0;
        for (const quest in quests)
        {
            if (quests[quest]?.startMonth)
            {
                const currentDate = new Date();
                const questStartDate = new Date(currentDate.getFullYear(), quests[quest].startMonth - 1, quests[quest].startDay)
                const questEndDate = new Date(currentDate.getFullYear(), quests[quest].endMonth - 1, quests[quest].endDay)
                
                if (currentDate < questStartDate || currentDate > questEndDate) 
                {
                    delete quests[quest].startMonth; 
                    delete quests[quest].endMonth; 
                    delete quests[quest].startDay; 
                    delete quests[quest].endDay
                    
                    questTable[quest] = quests[quest];
                    eventCount++;
                }
            }
        }
        this.logger.log(`[${this.mod}] Reactivated ${eventCount} Event Quests from Scorpion - Enjoy!`, "cyan");
        this.logger.log(`[${this.mod}] !!! Remember to fix your config.jsonc when you update this mod to keep event quest progress !!!`, "cyan");
    }

    private pushProductionUnlocks() {
        const databaseService: DatabaseService = container.resolve<DatabaseService>("DatabaseService");
        const recipesTable = databaseService.getTables().hideout.production.recipes;

        for (const item of productionJson)
        {
            recipesTable.push(item);
        }
    }

    private getRandomLoadMessage()
    {
        const value = loadMessage[Math.floor(Math.random() * Object.keys(loadMessage).length)];
        return value;
    }
}

/*
* 
* This is the interface for the config to validate the values
* 
*/
interface Config 
{
    randomizeStockAvailable: boolean,
    outOfStockChance: number,
    randomizeBuyRestriction: boolean,
    priceMultiplier: number,
    unlimitedStock: boolean,
    unlimitedBuyRestriction: boolean,
    removeLoyaltyRestriction: boolean,
    traderRefreshMin: number,
    traderRefreshMax: number,
    addTraderToFlea: boolean,
    eventQuestsAlwaysActive: boolean,
    debugLogging: boolean,
}

module.exports = { mod: new Scorpion() }