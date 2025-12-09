/*
    ©2000 Microsoft Corporation. All rights reserved.
*/

var visPane = 0;
var vidPane = 1;
var plPane = 2;
var eqPane = 3;
var currentPane = 0;

var vidIsRunning = false;
var update = false;

function OnLoad()
{
    pl.setColumnResizeMode(0, "Stretches");
    pl.setColumnResizeMode(1, "AutoSizeData");
    SetPane(visPane);
    vidIsRunning = (player.OpenState==osMediaOpen &&
        player.currentMedia.ImageSourceWidth>0);
    vidIsRunning ? StartVideo() : EndVideo();
    UpdateMetadata(false);
}

function StartVideo()
{
    vidIsRunning =
        bgVid.enabled =
        bgVid.tabStop = true;
    bgVis.enabled =
        bgVis.tabStop = false;
    SetPane(vidPane);
}

function EndVideo()
{
    vidIsRunning =
        bgVid.enabled =
        bgVid.tabStop = false;
    bgVis.enabled =
        bgVis.tabStop = true;
    if(currentPane==vidPane)
    {
        SetPane(visPane);
    }
}

function SetPane(newPane)
{
    switch(newPane)
    {
        case visPane:
            bgVis.upToolTip = xVis.toolTip;
            bgVid.upToolTip = "";
            bgPl.upToolTip = xPl.toolTip;
            bgEq.upToolTip = xEq.toolTip;
            visEffects.visible = true;
            vid.visible =
                sPl.visible =
                pl.visible =
                sEq.visible = false;
            break;
        case vidPane:
            bgVis.upToolTip = "";
            bgVid.upToolTip = "";
            bgPl.upToolTip = xPl.toolTip;
            bgEq.upToolTip = xEq.toolTip;
            bgVid.enabled =
                bgVid.tabStop = false;
            vid.visible = true;
            visEffects.visible =
                sPl.visible =
                pl.visible =
                sEq.visible = false;
            break;
        case plPane:
            if(vidIsRunning)
            {
                bgVis.upToolTip = "";
                bgVid.upToolTip = xVid.value;
                bgVid.enabled =
                    bgVid.tabStop = true;
            }
            else
            {
                bgVis.upToolTip = xVis.value;
                bgVid.upToolTip = "";
            }
            bgPl.upToolTip = xPl.value;
            bgEq.upToolTip = xEq.toolTip;
            sPl.visible =
                pl.visible = true;
            visEffects.visible =
                vid.visible =
                sEq.visible = false;
            break;
        case eqPane:
            if(vidIsRunning)
            {
                bgVis.upToolTip = "";
                bgVid.upToolTip = xVid.value;
                bgVid.enabled =
                    bgVid.tabStop = true;
            }
            else
            {
                bgVis.upToolTip = xVis.value;
                bgVid.upToolTip = "";
            }
            bgPl.upToolTip = xPl.toolTip;
            bgEq.upToolTip = xEq.value;
            sEq.visible = true;
            visEffects.visible =
                vid.visible =
                sPl.visible =
                pl.visible = false;
            break;
    }

    currentPane = newPane;
}

function UpdateMetadata(status)
{
    if(player.openState==osMediaOpen)
    {
        update = status ? true : !update;
        metadata.value = (update ?
            player.status : player.currentMedia.name);
    }
}