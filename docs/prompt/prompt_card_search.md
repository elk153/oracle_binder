## context:

* the repository https://github.com/elk153/oracle_binder/tree/dev 
* refactor the search functionality to have all searches in the search feature
* filtering functionalities remain available on each card browser
* policy is re-use first before coding new functions

## plan:

* NavBar
   * remove the search field and the toggle scryfall / collection from the NavBar
   * move the theme selector icon between decks and logout
   * re-organize the NavBar layout for consistency
*  Search
   * On the Search page, the user will see two toggle switches. 
      * one to search into scryfall database or in personal collection (binder and decks for virtual and proxies)
      * a second one to have a simple search looking for card name only or an advanced search looking for card name and other parameters 
      * defaults are scryfall and simple
   * simple search
      * when selecting scryfall, the search will be as the existing search capability
      * when doing a name search, there will be autocompletion on the name using 
   * advanced search
      * the advanced search will allow to look for names in the same spirit as https://scryfall.com/advanced 
      * the advanced search will work for both scryfall and collection searches
      * the advanced search will allow to search for 
         * card name:string
         * text on card:string + dropdown list for symbols with meaning
         * type line:string
         * flavor text:string
         * color:multi selection
         * commander color identity:multi selection
         * mana cost:dropdown  list of symbols + meaning
         * formats :legal, restricted or banned
         * rarity:multi slection
         * price in eur, with <= and >= or between possibilities
         * 
   * autocompletion
      * the app will prefetch the card names catalogue https://api.scryfall.com/catalog/card-names
      * the card name catalogue stale time will be aligned with scryfall card name catalogue refresh cycle
      * typing more than 3 characters in the name search field will trigger a dropdown list allowing to see the matching names and to select them
      * the same functionality will be available when searching in to the collection
      * the same functionality will be available for set name search
* Review the context and plan. analyze it for inconsistencies and ask questions where required.
* Establish a list of decisions to add to DECISIONS to allow a step by step execution of the plan

findings

* 1: search in collection is not yet implemented
* 2: search in favorites, binder, and decks. filter cards shall also allow to filter and/or sort cards results per location (binder, deck, type - owned, proxy, virtual)
* 3: OK
* 4: prefer the prefetch choice to reduce the number of queries on scryfall => stale at 4 o-clock each day
* 5: adapt names to make distinction between search and filter/sort
* 6: OK
* 7: use the existing search item from the navbar
* 8: login is automatically proposed when landing on pages requiring a login
* 9: list unused files to be safely deleted
* 10: OK


Questions: 

1. question is unclear, I don't know what to answer
2. it shall include favorite but. difference between favorite, binder, an deck will be visible through the icons on the cards in card browser
3. the navbar will just lose the search input field and the toggle switch. why the question. the default loading page is home
4. Keep as it is. use login/preference/etc. will be part of the later development
5. Propose an option to choose amongst exactly, includes, or at most
6. mana cost must be a symbol builder
7. Yes
8. native datalist


Enhance the decisions' description to ensure correct matching with the existing ui and logic as well as minimizing the required tokens to go through the decisions.
Adapt the decision list and write it in a md file for copy