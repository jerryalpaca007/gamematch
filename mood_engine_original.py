x=list(map(int,input("enter values with a space in this order: action,adventure,sports,simulation,platformer,rpg,shooter,action_adventure,fighting,horror,racing,rhythm & music,puzzle,strategy,sandbox,stealth,party,educational & serious,MOBA,survival,battle royale,card & board,idle,interactive story & visual novel").split()))
d={"action":x[0],"adventure":x[1],"sports":x[2],"simulation":x[3],"platformer":x[4],"rpg":x[5],"shooter":x[6],"action_adventure":x[7],"fighting":x[8],"horror":x[9],"racing":x[10],"rhythm & music":x[11],"puzzle":x[12],"strategy":x[13],"sandbox":x[14],"stealth":x[15],"party":x[16],"educational & serious":x[17],"MOBA":x[18],"survival":x[19],"battle royale":x[20],"card & board":x[21],"idle":x[22],"interactive story & visual novel":x[23]}
fun=0
competitive=0
calm=0
exciting=0
rush=0
morning=0
freetime=0
gamesviewed=0
casual=0
casual_and_friends=0
total=5
l=[fun,competitive,calm,exciting,rush,morning,freetime]
while True:
    for i in ["action","adventure","sports","simulation","platformer","rpg","shooter","action_adventure","fighting","racing",]:
        if i=="action" or i=="adventure" or i=="sports" or i=="simulation" or i=="platformer" or i=="rpg" or i=="shooter" or i=="action_adventure" or i=="fighting":
            fun+=1
            exciting+=1
            if i=="fighting" or i=="shooter" or i=="action":
                competitive+=1
    for i in ["rhythm & music","sandbox","party","card & board","interactive story & visual novel","puzzle"]:
        if i=="rhythm & music" or i=="sandbox" or i=="party" or i=="card & board" or i=="interactive story & visual novel" or i=="puzzle":
            fun+=1
            exciting+=1
            freetime+=1
            casual+=1
            if i=="Multiplayer" or i=="Co-op" or i=="Party":
                casual_and_friends+=1
    for i in ["action","adventure","sports","simulation","platformer","rpg","shooter","action_adventure","fighting","racing",]:
        if i=="action" or i=="adventure" or i=="sports" or i=="simulation" or i=="platformer" or i=="rpg" or i=="shooter" or i=="action_adventure" or i=="fighting":
            fun+=1
            exciting+=1
            if i=="fighting" or i=="shooter" or i=="action":
                competitive+=1
    