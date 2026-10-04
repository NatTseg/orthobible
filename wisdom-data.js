/* orthobible "Seek wisdom" — Scripture for the troubles, situations, and
   relationships of life. Original curation and framing lines, written for this app.
   References use LXX2012 numbering for the Old Testament and WEB for the New Testament. */
window.WISDOM = {
  about: "Passages for common troubles, decisions, and relationships, with a short frame for praying them.",
  categories: [
    {
      label: "Troubles of the heart",
      topics: [
        { id: "anxiety", title: "Anxiety & worry",
          line: "The Church's answer to anxiety is not stoicism but entrusting: hand the care to the Lord who cares for you, then let thanksgiving guard the heart.",
          refs: [["PHP",4,6,7],["MAT",6,25,34],["1PE",5,7],["PSA",54,22]] },
        { id: "fear", title: "Fear",
          line: "Perfect love casts out fear. Read these slowly, and let the presence of God become larger than the thing you fear.",
          refs: [["PSA",26,1],["ISA",41,10],["2TI",1,7],["PSA",45,1,2],["JHN",14,27]] },
        { id: "grief", title: "Grief & loss",
          line: "The Lord does not despise tears; He wept at a friend's tomb. We grieve, but as those who have hope in the Resurrection.",
          refs: [["PSA",33,18],["JHN",11,25,26],["1TH",4,13,14],["REV",21,4],["MAT",5,4]] },
        { id: "loneliness", title: "Loneliness",
          line: "God sets the solitary in families. Even when every human door closes, you are neither forgotten nor forsaken.",
          refs: [["PSA",24,16,17],["DEU",31,6],["HEB",13,5],["PSA",67,6],["JHN",14,18]] },
        { id: "weariness", title: "Weariness & despair",
          line: "When the soul is cast down, the Fathers prescribe the medicine of the Psalms and the yoke of Christ, which is easy because He carries it with you.",
          refs: [["PSA",41,11],["MAT",11,28,30],["2CO",4,8,9],["ISA",40,29,31],["GAL",6,9]] },
        { id: "illness", title: "Illness",
          line: "The Church anoints the sick with oil for healing of soul and body. Weakness is not abandonment; it is where His strength is made perfect.",
          refs: [["JAS",5,14,15],["PSA",40,3],["2CO",12,9,10],["PSA",102,2,3],["MRK",2,17]] },
        { id: "temptation", title: "Temptation",
          line: "No temptation is new and none is unbeatable. The way of escape is usually plain: flee early, pray simply, do not negotiate.",
          refs: [["1CO",10,13],["JAS",1,12,14],["HEB",4,15,16],["PSA",118,11],["MAT",6,13]] },
        { id: "doubt", title: "Doubt & weak faith",
          line: "Bring the doubt to God honestly, as the father did: “I believe; help my unbelief!” Faith is strengthened by use, not by hiding.",
          refs: [["MRK",9,24],["PSA",72,25,26],["JHN",20,27,29],["JAS",1,5,6],["HEB",11,1]] },
        { id: "guilt", title: "Guilt & repentance",
          line: "A broken and contrite heart God will not despise. Repentance is not despair over the past; it is the door back to the Father's embrace.",
          refs: [["PSA",50,1,3],["1JN",1,9],["LUK",15,20,24],["JOL",2,12,13],["PSA",31,5]] },
        { id: "far", title: "When God feels far away",
          line: "The saints all passed through this night. Nothing — not even your dryness — can separate you from the love of God in Christ Jesus.",
          refs: [["PSA",12,1,2],["PSA",21,1,2],["ISA",54,7,8],["ROM",8,38,39],["JOB",23,8,10]] },
        { id: "anger", title: "Anger & bitterness",
          line: "Anger kept overnight becomes a root of bitterness. The medicine is quick: bless, do not curse, and let the sun go down on peace.",
          refs: [["JAS",1,19,20],["EPH",4,26,27],["EPH",4,31,32],["PRO",15,1],["PSA",36,8]] }
      ]
    },
    {
      label: "Situations & decisions",
      topics: [
        { id: "guidance", title: "Guidance & decisions",
          line: "God guides the humble, not the clever. Ask, trust, take the next faithful step — and let peace be the umpire of the decision.",
          refs: [["PRO",3,5,6],["JAS",1,5],["PSA",31,8],["PSA",118,105],["ROM",12,2]] },
        { id: "waiting", title: "Waiting on God",
          line: "Waiting is not wasted time; it is where patience, the martyr's virtue, is formed. The vision has its appointed hour.",
          refs: [["PSA",26,14],["LAM",3,25,26],["ISA",40,31],["PSA",129,5,6],["HAB",2,3]] },
        { id: "work", title: "Work & diligence",
          line: "Done as to the Lord, the smallest task becomes worship. Offer today's work, then ask Him to establish the work of your hands.",
          refs: [["COL",3,23,24],["PRO",6,6,8],["ECC",9,10],["2TH",3,10,12],["PSA",89,17]] },
        { id: "money", title: "Money & contentment",
          line: "Godliness with contentment is great gain. Wealth is a tool and a test, never a home; lay up treasure where rust cannot reach.",
          refs: [["1TI",6,6,8],["PHP",4,11,13],["MAT",6,19,21],["PRO",11,24,25],["HEB",13,5]] },
        { id: "injustice", title: "Suffering injustice",
          line: "You are in good company: the Lord Himself entrusted His case to the One who judges justly. Vengeance is God's department, not yours.",
          refs: [["1PE",2,19,23],["PSA",36,1,2],["ROM",12,19,21],["MAT",5,10,12],["PSA",9,9]] },
        { id: "gratitude", title: "Gratitude",
          line: "Thanksgiving is the memory of the heart. Name the mercies aloud — it is astonishing how the list rearranges the day.",
          refs: [["1TH",5,16,18],["PSA",99,4,5],["COL",3,17],["PSA",135,1],["JAS",1,17]] },
        { id: "pride", title: "Pride & humility",
          line: "God resists the proud but gives grace to the humble. The way down is the way up; the publican went home justified.",
          refs: [["JAS",4,6],["PHP",2,3,5],["MIC",6,8],["PRO",16,18],["1PE",5,5,6]] }
      ]
    },
    {
      label: "Relationships",
      topics: [
        { id: "marriage", title: "Marriage",
          line: "Marriage is a small church: love as Christ loved the Church, and reverence one another. The cross, not the contract, is the pattern.",
          refs: [["GEN",2,24],["EPH",5,25,28],["EPH",5,33],["1PE",3,7],["SNG",8,7]] },
        { id: "family", title: "Parents & children",
          line: "The faith is caught more than taught. Nurture without provoking, honor without pretending — and let the home become a little church.",
          refs: [["EPH",6,1,4],["DEU",6,6,7],["COL",3,21],["PSA",126,3]] },
        { id: "forgiveness", title: "Conflict & forgiveness",
          line: "Forgive as you were forgiven — freely, fully, from the heart. It is the one prayer promise with a condition attached.",
          refs: [["MAT",18,21,22],["MAT",6,14,15],["COL",3,13],["ROM",12,18],["EPH",4,32]] },
        { id: "enemies", title: "Enemies & those who hurt you",
          line: "The Lord fights for you; you need only hold your peace. Blessing your enemy is not weakness — it is how sons resemble their Father.",
          refs: [["MAT",5,43,45],["LUK",6,27,28],["ROM",12,20,21],["PSA",36,7,9],["EXO",14,14]] },
        { id: "friendship", title: "Friendship & fellowship",
          line: "A friend loves at all times, and iron sharpens iron. Do not try to be a Christian alone; the faith has always traveled in twos.",
          refs: [["PRO",17,17],["PRO",27,17],["ECC",4,9,10],["JHN",15,12,13],["HEB",10,24,25]] },
        { id: "love", title: "Love — the measure of all",
          line: "By this everyone will know you are His disciples. Every other virtue is commentary on this one.",
          refs: [["1CO",13,4,8],["1JN",4,7,8],["JHN",13,34,35],["ROM",13,10],["1PE",4,8]] }
      ]
    }
  ]
};
